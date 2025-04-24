import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, differenceInBusinessDays, isWeekend } from "date-fns";
import { Redirect, Link } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Calendar as CalendarIcon, RefreshCw, ArrowLeft, FileText, Clock, Send, ClipboardCheck, X } from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Type definitions
type LeaveType = {
  id: number;
  name: string;
  description: string;
  allowedDays: number;
  requiresApproval: boolean;
  color: string;
};

type LeaveBalance = {
  id: number;
  userId: number;
  leaveTypeId: number;
  leaveTypeName: string;
  leaveTypeColor: string;
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
};

type LeaveRequest = {
  id: number;
  userId: number;
  leaveTypeId: number;
  leaveTypeName: string;
  leaveTypeColor: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  approvedById?: number;
  approverName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  attachmentUrl?: string;
  createdAt: string;
};

// Form validation schema
const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, "Please select a leave type"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  reason: z.string().min(1, "Reason is required").max(500, "Reason cannot exceed 500 characters"),
});

type LeaveRequestValues = z.infer<typeof leaveRequestSchema>;

const LeavePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("my-balance");
  const [cancelRequestId, setCancelRequestId] = useState<number | null>(null);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>("");
  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);

  // Redirect if not authenticated
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Fetch leave balances
  const { data: leaveBalances = [], isLoading: isLoadingBalances } = useQuery<LeaveBalance[]>({
    queryKey: ["/api/leave/balances"],
  });

  // Fetch leave types
  const { data: leaveTypes = [], isLoading: isLoadingTypes } = useQuery<LeaveType[]>({
    queryKey: ["/api/leave/types"],
  });

  // Fetch leave requests
  const { data: leaveRequests = [], isLoading: isLoadingRequests } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave/requests"],
  });

  // Initialize leave request form
  const form = useForm<LeaveRequestValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveTypeId: "",
      reason: "",
    },
  });

  // Calculate business days (excluding weekends)
  const calculateLeaveDays = (startDate?: Date, endDate?: Date) => {
    if (!startDate || !endDate) return 0;
    if (startDate > endDate) return 0;
    return differenceInBusinessDays(endDate, startDate) + (isWeekend(endDate) ? 0 : 1);
  };

  // Selected leave type information
  const selectedLeaveType = leaveTypes.find(
    (lt) => lt.id.toString() === selectedLeaveTypeId || lt.id.toString() === form.watch("leaveTypeId")
  );

  // Calculate total days requested
  const totalDaysRequested = calculateLeaveDays(form.watch("startDate"), form.watch("endDate"));

  // Create leave request mutation
  const createLeaveMutation = useMutation({
    mutationFn: async (data: LeaveRequestValues) => {
      // Convert the form data to the format expected by the API
      const payload = {
        leaveTypeId: parseInt(data.leaveTypeId),
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
      };
      const res = await apiRequest("POST", "/api/leave/requests", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave Request Submitted",
        description: "Your leave request has been successfully submitted",
      });
      // Reset form and close dialog
      form.reset();
      setIsRequestLeaveOpen(false);
      // Refresh leave data
      queryClient.invalidateQueries({ queryKey: ["/api/leave/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave/balances"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Submit Request",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Cancel leave request mutation
  const cancelLeaveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("POST", `/api/leave/requests/${requestId}/cancel`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave Request Cancelled",
        description: "Your leave request has been successfully cancelled",
      });
      setCancelRequestId(null);
      // Refresh leave data
      queryClient.invalidateQueries({ queryKey: ["/api/leave/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave/balances"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Cancel Request",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: LeaveRequestValues) => {
    createLeaveMutation.mutate(values);
  };

  // Handle cancel request
  const handleCancelRequest = () => {
    if (cancelRequestId) {
      cancelLeaveMutation.mutate(cancelRequestId);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };

  // Get leave status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-300">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-300">Rejected</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <Link href="/">
            <Button variant="ghost" size="icon" className="mr-2 hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to Home</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Leave Management
            </h1>
            <p className="text-muted-foreground mt-1">Request and manage your time off</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="default" 
            onClick={() => setIsRequestLeaveOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Request Leave
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/leave/balances"] });
              queryClient.invalidateQueries({ queryKey: ["/api/leave/requests"] });
              queryClient.invalidateQueries({ queryKey: ["/api/leave/types"] });
              toast({
                title: "Data Refreshed",
                description: "The latest leave information has been loaded",
              });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-lg mb-6">
          <TabsTrigger value="my-balance">My Balance</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          <TabsTrigger value="leave-calendar">Calendar</TabsTrigger>
        </TabsList>

        {/* Leave Balance Tab */}
        <TabsContent value="my-balance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isLoadingBalances ? (
              // Loading state
              Array(5).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-4 pb-2">
                    <Skeleton className="h-5 w-36 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Actual data
              leaveBalances.map((balance) => (
                <Card key={balance.id}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg" style={{ color: balance.leaveTypeColor }}>
                      {balance.leaveTypeName}
                    </CardTitle>
                    <CardDescription>{balance.year}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className="text-2xl font-bold">{balance.remainingDays} days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-lg">{balance.totalDays} days</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Used</p>
                        <p>{balance.usedDays} days</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pending</p>
                        <p>{balance.pendingDays} days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="my-requests">
          <Card>
            <CardHeader>
              <CardTitle>My Leave Requests</CardTitle>
              <CardDescription>
                View and manage your leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRequests ? (
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium text-lg mb-1">No Leave Requests</h3>
                  <p className="text-muted-foreground mb-4">You haven't submitted any leave requests yet.</p>
                  <Button onClick={() => setIsRequestLeaveOpen(true)}>Request Leave</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-medium" style={{ color: request.leaveTypeColor }}>
                            {request.leaveTypeName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </TableCell>
                        <TableCell>{request.totalDays}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">Details</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Leave Request Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-2">
                                <div className="flex justify-between">
                                  <Badge 
                                    variant="outline" 
                                    className="mb-4"
                                    style={{ 
                                      backgroundColor: `${request.leaveTypeColor}20`,
                                      color: request.leaveTypeColor,
                                      borderColor: request.leaveTypeColor
                                    }}
                                  >
                                    {request.leaveTypeName}
                                  </Badge>
                                  {getStatusBadge(request.status)}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">From</Label>
                                    <p className="font-medium">{formatDate(request.startDate)}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">To</Label>
                                    <p className="font-medium">{formatDate(request.endDate)}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label className="text-muted-foreground">Total Days</Label>
                                  <p className="font-medium">{request.totalDays} day(s)</p>
                                </div>
                                
                                <div>
                                  <Label className="text-muted-foreground">Reason</Label>
                                  <p className="mt-1">{request.reason}</p>
                                </div>
                                
                                {request.status === 'approved' && (
                                  <div>
                                    <Label className="text-muted-foreground">Approved By</Label>
                                    <p className="font-medium">{request.approverName || 'Admin'}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {request.approvedAt ? formatDate(request.approvedAt) : ''}
                                    </p>
                                  </div>
                                )}
                                
                                {request.status === 'rejected' && (
                                  <div>
                                    <Label className="text-muted-foreground">Rejection Reason</Label>
                                    <p className="mt-1">{request.rejectionReason || 'No reason provided'}</p>
                                  </div>
                                )}
                              </div>
                              <DialogFooter>
                                {request.status === 'pending' && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive">Cancel Request</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Cancel Leave Request</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to cancel this leave request? 
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>No, Keep Request</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => cancelLeaveMutation.mutate(request.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Yes, Cancel Request
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Calendar Tab */}
        <TabsContent value="leave-calendar">
          <Card>
            <CardHeader>
              <CardTitle>Leave Calendar</CardTitle>
              <CardDescription>
                View upcoming leaves and plan accordingly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium text-lg mb-1">Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Team leave calendar will be available in the next update.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Leave Dialog */}
      <Dialog open={isRequestLeaveOpen} onOpenChange={setIsRequestLeaveOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>
              Submit a request for time off from work
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="leaveTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedLeaveTypeId(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leaveTypes.map((type) => (
                          <SelectItem 
                            key={type.id} 
                            value={type.id.toString()}
                          >
                            <span style={{ color: type.color }}>■</span> {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date: Date) => 
                              date < new Date(new Date().setHours(0, 0, 0, 0)) || 
                              isWeekend(date)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date: Date) => 
                              (form.watch("startDate") && date < form.watch("startDate")) || 
                              date < new Date(new Date().setHours(0, 0, 0, 0)) || 
                              isWeekend(date)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("startDate") && form.watch("endDate") && (
                <div className="rounded-md border p-3 bg-muted/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Working Days:</span>
                    <span className="font-medium">{totalDaysRequested} days</span>
                  </div>
                  
                  {selectedLeaveType && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Leave Balance:</span>
                      <span className="font-medium">
                        {leaveBalances.find(b => b.leaveTypeId === parseInt(selectedLeaveTypeId))?.remainingDays || 0} days
                      </span>
                    </div>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="Briefly explain why you need this leave"
                        className="min-h-24 resize-none"
                      />
                    </FormControl>
                    <FormDescription>
                      Provide clear details to help with the approval process
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsRequestLeaveOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createLeaveMutation.isPending}
                >
                  {createLeaveMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Cancel Request Dialog */}
      <AlertDialog open={!!cancelRequestId} onOpenChange={() => setCancelRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this leave request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Request</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelRequest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelLeaveMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>Yes, Cancel Request</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeavePage;
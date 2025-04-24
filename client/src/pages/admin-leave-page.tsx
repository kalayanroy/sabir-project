import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Redirect, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, RefreshCw, Filter, FileText, Users, CheckCheck, X, UserCheck, Briefcase } from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
};

type LeaveRequest = {
  id: number;
  userId: number;
  username: string;
  email: string;
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

type LeaveSummary = {
  byStatus: { status: string; count: number }[];
  byType: { leaveTypeId: number; leaveTypeName: string; count: number; totalDays: number }[];
  byMonth: { month: number; count: number }[];
  year: number;
};

const AdminLeavePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending-requests");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [newLeaveType, setNewLeaveType] = useState({
    name: "",
    description: "",
    allowedDays: 0,
    color: "#3B82F6"
  });
  const [isAddLeaveTypeOpen, setIsAddLeaveTypeOpen] = useState(false);
  const [isEditLeaveTypeOpen, setIsEditLeaveTypeOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  
  // Redirect if not admin
  if (!user || (user.role !== "admin" && user.username !== "admin")) {
    return <Redirect to="/" />;
  }

  // Fetch all leave requests (admin view)
  const { 
    data: leaveRequests = [], 
    isLoading: isLoadingRequests 
  } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/admin/leave/requests", statusFilter],
    queryFn: async ({ queryKey }) => {
      const [_, status] = queryKey;
      const res = await fetch(`/api/admin/leave/requests?status=${status}`);
      if (!res.ok) throw new Error("Failed to fetch leave requests");
      return res.json();
    },
  });

  // Fetch all leave types
  const { 
    data: leaveTypes = [], 
    isLoading: isLoadingTypes 
  } = useQuery<LeaveType[]>({
    queryKey: ["/api/leave/types"],
  });

  // Fetch all users
  const { 
    data: users = [], 
    isLoading: isLoadingUsers 
  } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch leave summary
  const { 
    data: leaveSummary, 
    isLoading: isLoadingSummary 
  } = useQuery<LeaveSummary>({
    queryKey: ["/api/admin/leave/summary", selectedYear],
    queryFn: async ({ queryKey }) => {
      const [_, year] = queryKey;
      const res = await fetch(`/api/admin/leave/summary?year=${year}`);
      if (!res.ok) throw new Error("Failed to fetch leave summary");
      return res.json();
    },
  });

  // Fetch user leave balances when a user is selected
  const { 
    data: userLeaveBalances = [], 
    isLoading: isLoadingBalances 
  } = useQuery<LeaveBalance[]>({
    queryKey: ["/api/admin/leave/balances", selectedUserId, selectedYear],
    queryFn: async ({ queryKey }) => {
      const [_, userId, year] = queryKey;
      if (!userId) return [];
      const res = await fetch(`/api/admin/leave/balances/${userId}?year=${year}`);
      if (!res.ok) throw new Error("Failed to fetch user leave balances");
      return res.json();
    },
    enabled: !!selectedUserId,
  });

  // Approve leave request mutation
  const approveLeaveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("POST", `/api/admin/leave/requests/${requestId}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave Request Approved",
        description: "The leave request has been successfully approved",
      });
      setSelectedRequest(null);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/requests"] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/balances", selectedUserId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/summary"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Approve Request",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Reject leave request mutation
  const rejectLeaveMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/leave/requests/${requestId}/reject`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave Request Rejected",
        description: "The leave request has been rejected",
      });
      setSelectedRequest(null);
      setRejectionReason("");
      setIsRejectDialogOpen(false);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/requests"] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/balances", selectedUserId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/summary"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Reject Request",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Create leave type mutation
  const createLeaveTypeMutation = useMutation({
    mutationFn: async (data: typeof newLeaveType) => {
      const res = await apiRequest("POST", `/api/admin/leave/types`, {
        ...data,
        allowedDays: parseInt(data.allowedDays.toString()),
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave Type Created",
        description: "The new leave type has been successfully created",
      });
      setNewLeaveType({
        name: "",
        description: "",
        allowedDays: 0,
        color: "#3B82F6"
      });
      setIsAddLeaveTypeOpen(false);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leave/types"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Leave Type",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Initialize user leave balances mutation
  const initializeBalancesMutation = useMutation({
    mutationFn: async ({ userId, year }: { userId: number; year: number }) => {
      const res = await apiRequest("POST", `/api/admin/leave/balances/initialize/${userId}`, { year });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave Balances Initialized",
        description: "User leave balances have been successfully initialized",
      });
      // Refresh data
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/balances", selectedUserId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Initialize Balances",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Update leave balance mutation
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { totalDays: number } }) => {
      const res = await apiRequest("PUT", `/api/admin/leave/balances/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave Balance Updated",
        description: "The leave balance has been successfully updated",
      });
      // Refresh data
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/balances", selectedUserId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Balance",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Handle leave request approval
  const handleApproveRequest = (request: LeaveRequest) => {
    approveLeaveMutation.mutate(request.id);
  };

  // Handle leave request rejection (open dialog)
  const handleRejectRequest = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsRejectDialogOpen(true);
  };

  // Submit rejection
  const submitRejection = () => {
    if (selectedRequest && rejectionReason) {
      rejectLeaveMutation.mutate({
        requestId: selectedRequest.id,
        reason: rejectionReason
      });
    }
  };

  // Update leave type mutation
  const updateLeaveTypeMutation = useMutation({
    mutationFn: async (data: LeaveType) => {
      const res = await apiRequest("PUT", `/api/admin/leave/types/${data.id}`, {
        name: data.name,
        description: data.description,
        allowedDays: parseInt(data.allowedDays.toString()),
        color: data.color,
        requiresApproval: data.requiresApproval
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave Type Updated",
        description: "The leave type has been successfully updated",
      });
      setEditingLeaveType(null);
      setIsEditLeaveTypeOpen(false);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leave/types"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Leave Type",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Delete leave type mutation
  const deleteLeaveTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/leave/types/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave Type Deleted",
        description: "The leave type has been successfully deleted",
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leave/types"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete Leave Type",
        description: error.message || "The leave type may be in use by leave requests or balances",
        variant: "destructive",
      });
    },
  });

  // Handle create leave type
  const handleCreateLeaveType = () => {
    createLeaveTypeMutation.mutate(newLeaveType);
  };

  // Handle edit leave type (open dialog)
  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType({...leaveType});
    setIsEditLeaveTypeOpen(true);
  };

  // Handle update leave type
  const handleUpdateLeaveType = () => {
    if (editingLeaveType) {
      updateLeaveTypeMutation.mutate(editingLeaveType);
    }
  };

  // Handle delete leave type
  const handleDeleteLeaveType = (id: number) => {
    deleteLeaveTypeMutation.mutate(id);
  };

  // Handle initialize balances
  const handleInitializeBalances = (userId: number) => {
    initializeBalancesMutation.mutate({ userId, year: selectedYear });
  };

  // Handle update balance
  const handleUpdateBalance = (id: number, totalDays: number) => {
    updateBalanceMutation.mutate({ id, data: { totalDays } });
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

  // Get month name
  const getMonthName = (monthNum: number) => {
    return new Date(2000, monthNum - 1, 1).toLocaleString('default', { month: 'long' });
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
              Leave Administration
            </h1>
            <p className="text-muted-foreground mt-1">Manage leave types, balances, and employee requests</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="default" 
            onClick={() => setIsAddLeaveTypeOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            New Leave Type
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/requests"] });
              queryClient.invalidateQueries({ queryKey: ["/api/leave/types"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
              if (selectedUserId) {
                queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/balances", selectedUserId] });
              }
              queryClient.invalidateQueries({ queryKey: ["/api/admin/leave/summary"] });
              toast({
                title: "Data Refreshed",
                description: "All leave management data has been refreshed",
              });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full mb-6">
          <TabsTrigger value="pending-requests">Pending Requests</TabsTrigger>
          <TabsTrigger value="leave-balances">Leave Balances</TabsTrigger>
          <TabsTrigger value="leave-types">Leave Types</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Pending Requests Tab */}
        <TabsContent value="pending-requests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Leave Requests</CardTitle>
                <CardDescription>
                  Manage employee leave requests
                </CardDescription>
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Requests</SelectItem>
                  <SelectItem value="approved">Approved Requests</SelectItem>
                  <SelectItem value="rejected">Rejected Requests</SelectItem>
                  <SelectItem value="cancelled">Cancelled Requests</SelectItem>
                  <SelectItem value="all">All Requests</SelectItem>
                </SelectContent>
              </Select>
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
                  <h3 className="font-medium text-lg mb-1">No {statusFilter !== 'all' ? statusFilter : ''} Leave Requests</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no leave requests matching the selected filter.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
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
                          <div className="font-medium">{request.username}</div>
                          <div className="text-sm text-muted-foreground">{request.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium" style={{ color: request.leaveTypeColor }}>
                            {request.leaveTypeName}
                          </div>
                          <div className="text-xs text-muted-foreground">
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
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Leave Request Details</DialogTitle>
                                <DialogDescription>
                                  Review request details and take action
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2">
                                <div className="flex flex-wrap gap-2 justify-between items-start">
                                  <Badge 
                                    variant="outline" 
                                    className="mb-1"
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
                                
                                <div className="flex flex-col md:flex-row md:gap-6">
                                  <div className="flex-1 space-y-3 mb-4 md:mb-0">
                                    <div>
                                      <Label className="text-muted-foreground">Employee</Label>
                                      <p className="font-medium">{request.username}</p>
                                      <p className="text-sm text-muted-foreground">{request.email}</p>
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
                                      <Label className="text-muted-foreground">Request Date</Label>
                                      <p className="font-medium">{formatDate(request.createdAt)}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex-1 space-y-3">
                                    <div>
                                      <Label className="text-muted-foreground">Reason</Label>
                                      <p className="mt-1 border p-2 rounded-md bg-muted/50 min-h-[80px]">{request.reason}</p>
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
                                        <p className="mt-1 border p-2 rounded-md bg-muted/50">{request.rejectionReason || 'No reason provided'}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {request.status === 'pending' && (
                                <DialogFooter className="flex justify-between sm:justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                    onClick={() => handleRejectRequest(request)}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                    onClick={() => handleApproveRequest(request)}
                                    disabled={approveLeaveMutation.isPending}
                                  >
                                    {approveLeaveMutation.isPending ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCheck className="h-4 w-4 mr-2" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              )}
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

        {/* Leave Balances Tab */}
        <TabsContent value="leave-balances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Leave Balances</CardTitle>
                <CardDescription>
                  Manage employee leave balances
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select 
                  value={selectedUserId?.toString() || ""}
                  onValueChange={(val) => setSelectedUserId(val ? parseInt(val) : null)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={selectedYear.toString()}
                  onValueChange={(val) => setSelectedYear(parseInt(val))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedUserId ? (
                <div className="text-center py-16">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium text-lg mb-1">Select an Employee</h3>
                  <p className="text-muted-foreground">
                    Choose an employee to view and manage their leave balances
                  </p>
                </div>
              ) : isLoadingBalances ? (
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
              ) : userLeaveBalances.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium text-lg mb-1">No Leave Balances</h3>
                  <p className="text-muted-foreground mb-4">
                    This employee doesn't have any leave balances for {selectedYear}.
                  </p>
                  <Button 
                    onClick={() => handleInitializeBalances(selectedUserId)} 
                    disabled={initializeBalancesMutation.isPending}
                  >
                    {initializeBalancesMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      <>Initialize Leave Balances</>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-4 pb-2 border-b">
                    <p className="text-sm text-muted-foreground">
                      Showing leave balances for: <span className="font-medium">{users.find(u => u.id === selectedUserId)?.username}</span> ({selectedYear})
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userLeaveBalances.map((balance) => (
                      <Card key={balance.id} className="overflow-hidden">
                        <CardHeader className="p-4 pb-2" style={{ backgroundColor: `${balance.leaveTypeColor}10` }}>
                          <CardTitle className="text-lg" style={{ color: balance.leaveTypeColor }}>
                            {balance.leaveTypeName}
                          </CardTitle>
                          <CardDescription>Balance for {balance.year}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mt-2">
                            <div>
                              <p className="text-sm text-muted-foreground">Remaining</p>
                              <p className="text-2xl font-bold">{balance.remainingDays} days</p>
                            </div>
                            <div className="flex items-end gap-2">
                              <Input 
                                type="number" 
                                className="w-16 h-8 text-right" 
                                defaultValue={balance.totalDays}
                                min="0"
                                max="365"
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value);
                                  if (!isNaN(newValue) && newValue >= 0) {
                                    // You can implement debounced updates here
                                  }
                                }}
                                onBlur={(e) => {
                                  const newValue = parseInt(e.target.value);
                                  if (!isNaN(newValue) && newValue >= 0 && newValue !== balance.totalDays) {
                                    handleUpdateBalance(balance.id, newValue);
                                  }
                                }}
                              />
                              <p className="text-sm text-muted-foreground mb-1">total days</p>
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
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleInitializeBalances(selectedUserId)}
                      disabled={initializeBalancesMutation.isPending}
                    >
                      {initializeBalancesMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>Refresh Balances</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Types Tab */}
        <TabsContent value="leave-types">
          <Card>
            <CardHeader>
              <CardTitle>Leave Types</CardTitle>
              <CardDescription>
                Manage leave types available in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTypes ? (
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Default Days</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Requires Approval</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium" style={{ color: type.color }}>
                          {type.name}
                        </TableCell>
                        <TableCell>{type.description}</TableCell>
                        <TableCell>{type.allowedDays} days</TableCell>
                        <TableCell>
                          <div 
                            className="w-6 h-6 rounded-full border" 
                            style={{ backgroundColor: type.color }} 
                          />
                        </TableCell>
                        <TableCell>
                          {type.requiresApproval ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Yes</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditLeaveType(type)}
                            >
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 border-red-200 hover:bg-red-50"
                                >
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Leave Type</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the "{type.name}" leave type? This action cannot be undone.
                                    If this leave type is already in use, it cannot be deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteLeaveType(type.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    {deleteLeaveTypeMutation.isPending && deleteLeaveTypeMutation.variables === type.id ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      "Delete"
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Leave Reports and Statistics</CardTitle>
                <CardDescription>
                  View leave utilization and trends
                </CardDescription>
              </div>
              <Select 
                value={selectedYear.toString()}
                onValueChange={(val) => setSelectedYear(parseInt(val))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <div className="space-y-6">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : !leaveSummary ? (
                <div className="text-center py-16">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium text-lg mb-1">No Data Available</h3>
                  <p className="text-muted-foreground">
                    There are no leave records for {selectedYear} yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Status Summary */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Leave Requests by Status</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {leaveSummary.byStatus.map((status) => (
                        <Card key={status.status} className="overflow-hidden">
                          <CardHeader className={`p-4 pb-0 ${
                            status.status === 'pending' ? 'bg-yellow-50' : 
                            status.status === 'approved' ? 'bg-green-50' : 
                            status.status === 'rejected' ? 'bg-red-50' : 
                            'bg-gray-50'
                          }`}>
                            <CardTitle className="text-lg capitalize">{status.status}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-2">
                            <p className="text-3xl font-bold">{status.count}</p>
                            <p className="text-sm text-muted-foreground">leave requests</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {/* Leave by Type */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Leave Days by Type</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Requests</TableHead>
                            <TableHead>Days</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leaveSummary.byType.map((type) => (
                            <TableRow key={type.leaveTypeId}>
                              <TableCell className="font-medium">
                                {type.leaveTypeName}
                              </TableCell>
                              <TableCell>{type.count}</TableCell>
                              <TableCell>{type.totalDays}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  {/* Monthly Distribution */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Monthly Distribution</h3>
                    <div className="h-64 relative">
                      <div className="flex h-full items-end">
                        {leaveSummary.byMonth.map((month) => (
                          <div 
                            key={month.month} 
                            className="flex-1 flex flex-col items-center justify-end h-full relative group"
                          >
                            <div 
                              className="bg-primary/15 hover:bg-primary/25 w-8 transition-all"
                              style={{ 
                                height: `${(month.count / Math.max(...leaveSummary.byMonth.map(m => m.count), 1)) * 80}%`,
                                minHeight: '8px'
                              }}
                            />
                            <div className="absolute bottom-0 -mb-5 transform translate-y-full text-xs font-medium">
                              {getMonthName(month.month).substring(0, 3)}
                            </div>
                            <div className="absolute top-0 -mt-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Badge variant="secondary">{month.count}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-0 w-full border-t"></div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Request Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea 
              id="rejection-reason"
              placeholder="Explain why this leave request is being rejected"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitRejection}
              disabled={!rejectionReason.trim() || rejectLeaveMutation.isPending}
            >
              {rejectLeaveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>Reject Request</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Type Dialog */}
      <Dialog open={isEditLeaveTypeOpen} onOpenChange={setIsEditLeaveTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Type</DialogTitle>
            <DialogDescription>
              Update the selected leave type's details
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="edit-leave-name">Leave Type Name</Label>
              <Input 
                id="edit-leave-name"
                placeholder="e.g., Study Leave"
                value={editingLeaveType?.name || ""}
                onChange={(e) => setEditingLeaveType(prev => 
                  prev ? {...prev, name: e.target.value} : null
                )}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-leave-desc">Description</Label>
              <Textarea 
                id="edit-leave-desc"
                placeholder="Leave description"
                value={editingLeaveType?.description || ""}
                onChange={(e) => setEditingLeaveType(prev => 
                  prev ? {...prev, description: e.target.value} : null
                )}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="edit-leave-days">Default Allowed Days (per year)</Label>
              <Input 
                id="edit-leave-days"
                type="number"
                min="0"
                max="365"
                placeholder="e.g., 10"
                value={editingLeaveType?.allowedDays || ""}
                onChange={(e) => setEditingLeaveType(prev => 
                  prev ? {...prev, allowedDays: e.target.value ? parseInt(e.target.value) : 0} : null
                )}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-leave-color">Color</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  id="edit-leave-color"
                  type="color"
                  value={editingLeaveType?.color || "#3B82F6"}
                  onChange={(e) => setEditingLeaveType(prev => 
                    prev ? {...prev, color: e.target.value} : null
                  )}
                  className="w-12 h-9 p-1"
                />
                <div 
                  className="flex-1 rounded-md border flex items-center px-3"
                  style={{ 
                    backgroundColor: `${editingLeaveType?.color || "#3B82F6"}20`, 
                    borderColor: editingLeaveType?.color || "#3B82F6" 
                  }}
                >
                  <span style={{ color: editingLeaveType?.color || "#3B82F6" }}>
                    {editingLeaveType?.name || 'Leave Type Preview'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox 
                id="edit-requires-approval" 
                checked={editingLeaveType?.requiresApproval ?? true}
                onCheckedChange={(checked) => setEditingLeaveType(prev => 
                  prev ? {...prev, requiresApproval: !!checked} : null
                )}
              />
              <Label htmlFor="edit-requires-approval">Requires manager approval</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditLeaveTypeOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateLeaveType}
              disabled={!editingLeaveType?.name || updateLeaveTypeMutation.isPending}
            >
              {updateLeaveTypeMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Leave Type Dialog */}
      <Dialog open={isAddLeaveTypeOpen} onOpenChange={setIsAddLeaveTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Leave Type</DialogTitle>
            <DialogDescription>
              Create a new leave type for employees
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="leave-name">Leave Type Name</Label>
              <Input 
                id="leave-name"
                placeholder="e.g., Study Leave"
                value={newLeaveType.name}
                onChange={(e) => setNewLeaveType({...newLeaveType, name: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="leave-desc">Description</Label>
              <Textarea 
                id="leave-desc"
                placeholder="Leave description"
                value={newLeaveType.description}
                onChange={(e) => setNewLeaveType({...newLeaveType, description: e.target.value})}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="leave-days">Default Allowed Days (per year)</Label>
              <Input 
                id="leave-days"
                type="number"
                min="0"
                max="365"
                placeholder="e.g., 10"
                value={newLeaveType.allowedDays || ""}
                onChange={(e) => setNewLeaveType({
                  ...newLeaveType, 
                  allowedDays: e.target.value ? parseInt(e.target.value) : 0
                })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="leave-color">Color</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  id="leave-color"
                  type="color"
                  value={newLeaveType.color}
                  onChange={(e) => setNewLeaveType({...newLeaveType, color: e.target.value})}
                  className="w-12 h-9 p-1"
                />
                <div 
                  className="flex-1 rounded-md border flex items-center px-3"
                  style={{ backgroundColor: `${newLeaveType.color}20`, borderColor: newLeaveType.color }}
                >
                  <span style={{ color: newLeaveType.color }}>
                    {newLeaveType.name || 'Leave Type Preview'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddLeaveTypeOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateLeaveType}
              disabled={!newLeaveType.name.trim() || createLeaveTypeMutation.isPending}
            >
              {createLeaveTypeMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>Create Leave Type</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeavePage;
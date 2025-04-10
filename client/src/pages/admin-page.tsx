import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, CheckCircle, AlertCircle } from "lucide-react";

// Blocked device type from server
type BlockedDevice = {
  id: number;
  deviceId: string;
  attempts: number;
  lastAttempt: string;
  isBlocked: boolean;
  blockedAt: string;
  blockReason: string;
  unblockRequestSent: boolean;
  unblockRequestMessage: string;
};

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDevice, setSelectedDevice] = useState<BlockedDevice | null>(null);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);

  // Only admin can access this page
  if (!user || user.username !== "admin1") {
    return <Redirect to="/" />;
  }

  // Fetch all blocked devices
  const {
    data: blockedDevices,
    isLoading,
    error,
    refetch,
  } = useQuery<BlockedDevice[], Error>({
    queryKey: ["/api/admin/blocked-devices"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/blocked-devices");
      return await response.json();
    },
  });

  // Mutation to unblock a device
  const unblockDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await apiRequest("POST", "/api/admin/unblock-device", { deviceId });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device unblocked",
        description: "The device has been successfully unblocked.",
        variant: "default",
      });
      setRequestDetailsOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unblock device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // View request details
  const handleViewRequest = (device: BlockedDevice) => {
    setSelectedDevice(device);
    setRequestDetailsOpen(true);
  };

  // Mutation to reject a device unblock request
  const rejectUnblockRequestMutation = useMutation({
    mutationFn: async ({ deviceId, reason }: { deviceId: string; reason: string }) => {
      const response = await apiRequest("POST", "/api/admin/reject-unblock-request", { deviceId, reason });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request rejected",
        description: "The unblock request has been rejected.",
        variant: "default",
      });
      setRequestDetailsOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // States for rejection
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Approve unblock request
  const handleApproveRequest = () => {
    if (selectedDevice) {
      unblockDeviceMutation.mutate(selectedDevice.deviceId);
    }
  };

  // Reject unblock request
  const handleRejectRequest = () => {
    if (!isRejecting) {
      setIsRejecting(true);
      return;
    }

    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    if (selectedDevice) {
      rejectUnblockRequestMutation.mutate({
        deviceId: selectedDevice.deviceId,
        reason: rejectionReason
      });
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
            <CardDescription>Error loading blocked devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 p-4 rounded-md text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p>{error.message}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => refetch()}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Admin Dashboard
            </CardTitle>
            <CardDescription>Manage blocked devices and unblock requests</CardDescription>
          </div>
          <Button size="sm" onClick={() => refetch()}>Refresh</Button>
        </CardHeader>

        <CardContent>
          {blockedDevices && blockedDevices.length > 0 ? (
            <Table>
              <TableCaption>List of currently blocked devices</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Blocked At</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Unblock Request</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-mono">{device.deviceId}</TableCell>
                    <TableCell>{formatDate(device.blockedAt)}</TableCell>
                    <TableCell>{device.blockReason}</TableCell>
                    <TableCell>{device.attempts}</TableCell>
                    <TableCell>
                      {device.unblockRequestSent ? (
                        <Badge className="bg-amber-500">Pending</Badge>
                      ) : (
                        <Badge variant="outline">None</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!device.unblockRequestSent}
                        onClick={() => handleViewRequest(device)}
                      >
                        {device.unblockRequestSent ? "View Request" : "No Request"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <p>No blocked devices found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={requestDetailsOpen} onOpenChange={setRequestDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unblock Request Details</DialogTitle>
            <DialogDescription>
              Review the user's request to unblock their device.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDevice && (
            <div className="space-y-4 my-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Device ID:</div>
                <div className="font-mono">{selectedDevice.deviceId}</div>
                
                <div className="font-medium">Blocked On:</div>
                <div>{formatDate(selectedDevice.blockedAt)}</div>
                
                <div className="font-medium">Number of Attempts:</div>
                <div>{selectedDevice.attempts}</div>
                
                <div className="font-medium">Block Reason:</div>
                <div>{selectedDevice.blockReason}</div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="font-medium mb-2">User's Message:</div>
                <div className="bg-secondary/50 p-3 rounded-md whitespace-pre-wrap">
                  {selectedDevice.unblockRequestMessage || "No message provided"}
                </div>
              </div>
            </div>
          )}
          
          {/* Rejection reason input */}
          {isRejecting && (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">
                Rejection Reason:
              </label>
              <Textarea
                placeholder="Please enter a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          <DialogFooter className="gap-2 flex flex-col sm:flex-row mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejecting(false);
                setRequestDetailsOpen(false);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={handleRejectRequest}
                disabled={rejectUnblockRequestMutation.isPending || unblockDeviceMutation.isPending}
                variant="destructive"
                className="gap-2 w-full sm:w-auto"
              >
                {rejectUnblockRequestMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {isRejecting ? "Confirm Reject" : "Reject"}
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleApproveRequest}
                disabled={rejectUnblockRequestMutation.isPending || unblockDeviceMutation.isPending || isRejecting}
                className="gap-2 w-full sm:w-auto"
              >
                {unblockDeviceMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
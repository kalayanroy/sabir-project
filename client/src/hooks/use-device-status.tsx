import { useMutation, useQuery } from "@tanstack/react-query";
import { getDeviceInfo } from "@/lib/device-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type DeviceStatus = {
  isBlocked: boolean;
  attempts: number;
  message: string;
  unblockRequestSent?: boolean;
};

type UnblockRequestData = {
  deviceId: string;
  message: string;
};

export function useDeviceStatus() {
  const { toast } = useToast();
  const deviceInfo = getDeviceInfo();
  
  const { 
    data: deviceStatus, 
    isLoading, 
    error,
    refetch
  } = useQuery<DeviceStatus, Error>({
    queryKey: ["/api/device-status", deviceInfo.deviceId],
    queryFn: async () => {
      if (!deviceInfo.deviceId) {
        return {
          isBlocked: false,
          attempts: 0,
          message: "No device ID available"
        };
      }
      
      const response = await apiRequest(
        "GET", 
        `/api/device-status?deviceId=${deviceInfo.deviceId}`
      );
      
      return await response.json();
    },
    // Only fetch if we have a device ID
    enabled: !!deviceInfo.deviceId,
  });
  
  const submitUnblockRequestMutation = useMutation({
    mutationFn: async (data: UnblockRequestData) => {
      const response = await apiRequest("POST", "/api/submit-unblock-request", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Unblock request submitted",
        description: "Your request has been sent to the administrator for review.",
        variant: "default"
      });
      // Refetch the device status to show that request has been submitted
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit unblock request",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  return {
    deviceStatus,
    isLoading,
    error,
    submitUnblockRequestMutation,
    deviceId: deviceInfo.deviceId
  };
}
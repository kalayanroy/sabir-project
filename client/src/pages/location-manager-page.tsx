import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, LogIn, LogOut, MapPin, AlertCircle } from "lucide-react";
// Import Map icon separately to avoid conflict with built-in Map object
import { Map as MapIcon } from "lucide-react";

// User location history type
type UserLocation = {
  id: number;
  userId: number;
  username?: string;
  email?: string;
  eventType: 'login' | 'logout';
  timestamp: string;
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
  addressInfo?: {
    city?: string;
    state?: string;
    country?: string;
    formatted?: string;
  };
  deviceInfo?: string;
};

export default function LocationManagerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Set page title
  useEffect(() => {
    document.title = "Location Manager | SecureLogin";
  }, []);

  // Only admin can access this page
  if (!user || user.username !== "admin1") {
    return <Redirect to="/" />;
  }

  // Fetch location history
  const {
    data: locationHistory,
    isLoading,
    error,
    refetch: refetchLocations,
  } = useQuery<UserLocation[], Error>({
    queryKey: ["/api/admin/location-history"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/location-history");
      return await response.json();
    },
  });

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
            <CardTitle className="text-2xl">Location Manager</CardTitle>
            <CardDescription>Error loading data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 p-4 rounded-md text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p>{error.message}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => refetchLocations()}>Try Again</Button>
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
              <MapIcon className="h-6 w-6 text-primary" />
              Location Manager
            </CardTitle>
            <CardDescription>User login and logout location tracking</CardDescription>
          </div>
          <Button size="sm" onClick={() => refetchLocations()}>Refresh</Button>
        </CardHeader>

        <CardContent>
          {locationHistory && locationHistory.length > 0 ? (
            <Table>
              <TableCaption>User Login/Logout Location History</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Device Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationHistory.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      <div className="font-medium">{location.username || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{location.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.eventType === 'login' ? 'default' : 'secondary'} className="flex items-center gap-1">
                        {location.eventType === 'login' ? (
                          <>
                            <LogIn className="h-3 w-3" />
                            Login
                          </>
                        ) : (
                          <>
                            <LogOut className="h-3 w-3" />
                            Logout
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(location.timestamp)}</TableCell>
                    <TableCell>
                      {location.latitude && location.longitude ? (
                        <div className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            {location.addressInfo?.formatted || 
                              `${location.addressInfo?.city || ''} ${location.addressInfo?.state || ''} ${location.addressInfo?.country || ''}` || 
                              `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No location data</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{location.ipAddress || "N/A"}</code>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {location.deviceInfo || "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <p>No location history found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
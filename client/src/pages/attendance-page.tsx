import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { formatDistanceToNow, format, isToday, parseISO } from "date-fns";
import { Clock, Calendar as CalendarIcon, MapPin, ArrowRight, CheckCircle2, XCircle, AlertCircle, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Define types
type WorkLocation = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  description?: string;
};

type AttendanceRecord = {
  id: number;
  userId: number;
  workLocationId: number;
  clockInTime: string;
  clockOutTime?: string;
  totalHours?: number;
  status: string;
  notes?: string;
  isWithinGeofence: boolean;
  date: string;
};

type WorkStats = {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHours: number;
  averageHoursPerDay: number;
};

const AttendancePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);

  // Current clock status
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);

  // Get user's work locations
  const { data: workLocations = [] } = useQuery<WorkLocation[]>({
    queryKey: ["/api/attendance/work-locations"],
    enabled: !!user,
  });

  // Get user's attendance records
  const { data: attendanceRecords = [], isLoading: isLoadingRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance/records"],
    enabled: !!user,
    onSuccess: (data: AttendanceRecord[]) => {
      // Check if user is already clocked in today
      const todayRecord = data.find((record: AttendanceRecord) => 
        isToday(new Date(record.date)) && !record.clockOutTime
      );
      
      if (todayRecord) {
        setIsClockedIn(true);
        setCurrentRecord(todayRecord);
      } else {
        setIsClockedIn(false);
        setCurrentRecord(null);
      }
    }
  });

  // Get user's work statistics
  const { data: workStats } = useQuery<WorkStats>({
    queryKey: ["/api/attendance/stats"],
    enabled: !!user,
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async (locationData: { latitude: number; longitude: number }) => {
      const res = await apiRequest("POST", "/api/attendance/clock-in", locationData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/records"] });
      toast({
        title: "Clocked In Successfully",
        description: data.message,
        variant: "default",
      });
      setIsClockedIn(true);
      setCurrentRecord(data.attendance);
    },
    onError: (error: Error) => {
      toast({
        title: "Clock In Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async (locationData: { latitude: number; longitude: number }) => {
      const res = await apiRequest("POST", "/api/attendance/clock-out", locationData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({
        title: "Clocked Out Successfully",
        description: data.message,
        variant: "default",
      });
      setIsClockedIn(false);
      setCurrentRecord(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Clock Out Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to get current location
  const getCurrentLocation = (action: "in" | "out") => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setPosition({ latitude, longitude });
          
          if (action === "in") {
            clockInMutation.mutate({ latitude, longitude });
          } else {
            clockOutMutation.mutate({ latitude, longitude });
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your current location. Please enable location services.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Location Not Supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
    }
  };

  // Format time from ISO string
  const formatTime = (isoString?: string) => {
    if (!isoString) return "N/A";
    return format(new Date(isoString), "h:mm a");
  };

  // Format date from ISO string
  const formatDate = (isoString: string) => {
    return format(new Date(isoString), "MMM d, yyyy");
  };

  // Format work location name
  const getLocationName = (locationId: number) => {
    const location = workLocations.find(loc => loc.id === locationId);
    return location ? location.name : "Unknown Location";
  };

  // Get status badge variant
  const getStatusBadge = (status: string, isWithinGeofence: boolean) => {
    if (status === "present" && isWithinGeofence) {
      return <Badge className="bg-green-500">Present</Badge>;
    } else if (status === "present" && !isWithinGeofence) {
      return <Badge className="bg-yellow-500">Remote</Badge>;
    } else if (status === "absent") {
      return <Badge className="bg-red-500">Absent</Badge>;
    } else if (status === "late") {
      return <Badge className="bg-orange-500">Late</Badge>;
    } else {
      return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Attendance Management</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
          <TabsTrigger value="locations">Work Locations</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Clock In/Out Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Clock In/Out</CardTitle>
                <CardDescription>
                  Record your attendance by clocking in and out from your work location
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2">
                      {format(new Date(), "h:mm a")}
                    </div>
                    <div className="text-muted-foreground">
                      {format(new Date(), "EEEE, MMMM d, yyyy")}
                    </div>
                  </div>

                  {isClockedIn && currentRecord && (
                    <div className="text-center p-4 bg-muted rounded-lg w-full">
                      <p className="font-medium">
                        You clocked in at {formatTime(currentRecord.clockInTime)} at{" "}
                        {getLocationName(currentRecord.workLocationId)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {formatDistanceToNow(new Date(currentRecord.clockInTime))}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      size="lg"
                      variant={isClockedIn ? "outline" : "default"}
                      className={!isClockedIn ? "bg-green-600 hover:bg-green-700" : ""}
                      disabled={isClockedIn || clockInMutation.isPending}
                      onClick={() => getCurrentLocation("in")}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Clock In
                    </Button>
                    <Button
                      size="lg"
                      variant={!isClockedIn ? "outline" : "default"}
                      className={isClockedIn ? "bg-red-600 hover:bg-red-700" : ""}
                      disabled={!isClockedIn || clockOutMutation.isPending}
                      onClick={() => getCurrentLocation("out")}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Clock Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Work Stats</CardTitle>
                <CardDescription>This month's attendance statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {workStats ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Present Days:</span>
                      <span className="font-medium">{workStats.presentDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Absent Days:</span>
                      <span className="font-medium">{workStats.absentDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Late Days:</span>
                      <span className="font-medium">{workStats.lateDays}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Hours:</span>
                      <span className="font-medium">{workStats.totalHours.toFixed(1)} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Average:</span>
                      <span className="font-medium">{workStats.averageHoursPerDay.toFixed(1)} hrs</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No statistics available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Attendance Records */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Recent Attendance Records</CardTitle>
                <CardDescription>Your last 5 attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRecords ? (
                  <div className="text-center py-4">Loading records...</div>
                ) : attendanceRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.slice(0, 5).map((record: AttendanceRecord) => (
                          <TableRow key={record.id}>
                            <TableCell>{formatDate(record.date)}</TableCell>
                            <TableCell>{getLocationName(record.workLocationId)}</TableCell>
                            <TableCell>{formatTime(record.clockInTime)}</TableCell>
                            <TableCell>{formatTime(record.clockOutTime)}</TableCell>
                            <TableCell>
                              {record.totalHours?.toFixed(1) || "-"}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(record.status, record.isWithinGeofence)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No attendance records found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance History Tab */}
        <TabsContent value="history">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>Select a date to view records</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>
                  Your attendance history for {format(selectedDate, "MMMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRecords ? (
                  <div className="text-center py-4">Loading records...</div>
                ) : attendanceRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords
                          .filter((record: AttendanceRecord) => {
                            const recordDate = new Date(record.date);
                            return (
                              recordDate.getMonth() === selectedDate.getMonth() &&
                              recordDate.getFullYear() === selectedDate.getFullYear()
                            );
                          })
                          .map((record: AttendanceRecord) => (
                            <TableRow key={record.id}>
                              <TableCell>{formatDate(record.date)}</TableCell>
                              <TableCell>{getLocationName(record.workLocationId)}</TableCell>
                              <TableCell>{formatTime(record.clockInTime)}</TableCell>
                              <TableCell>{formatTime(record.clockOutTime)}</TableCell>
                              <TableCell>
                                {record.totalHours?.toFixed(1) || "-"}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(record.status, record.isWithinGeofence)}
                              </TableCell>
                              <TableCell>{record.notes || "-"}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No attendance records found for this month
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Work Locations Tab */}
        <TabsContent value="locations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workLocations.length > 0 ? (
              workLocations.map((location) => (
                <Card key={location.id}>
                  <CardHeader>
                    <CardTitle>{location.name}</CardTitle>
                    <CardDescription>{location.address}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="text-sm">{location.address}</p>
                          <p className="text-xs text-muted-foreground">
                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      {location.description && (
                        <p className="text-sm text-muted-foreground">
                          {location.description}
                        </p>
                      )}
                      <div className="text-sm flex items-center gap-1">
                        <span className="text-muted-foreground">Geofence radius:</span>
                        <span>{location.radius} meters</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Work Locations Assigned</h3>
                <p>
                  You don't have any assigned work locations. Please contact your administrator.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendancePage;
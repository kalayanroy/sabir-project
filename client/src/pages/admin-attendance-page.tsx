import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isToday, parseISO } from "date-fns";
import { Filter, MapPin, Plus, UserPlus, BarChart3, Calendar as CalendarIcon, User, Users, LayoutGrid } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Redirect } from "wouter";

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

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
};

type WorkStats = {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHours: number;
  averageHoursPerDay: number;
};

type NewLocationData = {
  name: string;
  address: string;
  description?: string;
  latitude: number;
  longitude: number;
  radius: number;
};

type AssignLocationData = {
  userId: number;
  locationId: number;
};

const AdminAttendancePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newLocation, setNewLocation] = useState<NewLocationData>({
    name: "",
    address: "",
    description: "",
    latitude: 0,
    longitude: 0,
    radius: 100,
  });
  const [assignLocation, setAssignLocation] = useState<AssignLocationData>({
    userId: 0,
    locationId: 0,
  });
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isAssigningLocation, setIsAssigningLocation] = useState(false);

  // Redirect if not admin
  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  // Get all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user && user.role === "admin",
  });

  // Get all work locations
  const { data: workLocations = [] } = useQuery<WorkLocation[]>({
    queryKey: ["/api/admin/attendance/work-locations"],
    enabled: !!user && user.role === "admin",
  });

  // Get all attendance records
  const { data: attendanceRecords = [], isLoading: isLoadingRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/admin/attendance/records"],
    enabled: !!user && user.role === "admin",
  });

  // Get user stats if a user is selected
  const { data: userStats } = useQuery<WorkStats>({
    queryKey: ["/api/admin/attendance/user-stats", selectedUserId],
    enabled: !!selectedUserId && !!user && user.role === "admin",
  });

  // Create new work location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (locationData: NewLocationData) => {
      const res = await apiRequest("POST", "/api/admin/attendance/work-locations", locationData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/attendance/work-locations"] });
      toast({
        title: "Location Created",
        description: `${newLocation.name} has been successfully created.`,
        variant: "default",
      });
      setNewLocation({
        name: "",
        address: "",
        description: "",
        latitude: 0,
        longitude: 0,
        radius: 100,
      });
      setIsAddingLocation(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Location",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign user to location mutation
  const assignLocationMutation = useMutation({
    mutationFn: async (data: AssignLocationData) => {
      const res = await apiRequest("POST", "/api/admin/attendance/assign-location", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Location Assigned",
        description: "User has been successfully assigned to the location.",
        variant: "default",
      });
      setAssignLocation({
        userId: 0,
        locationId: 0,
      });
      setIsAssigningLocation(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Assign Location",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle creating a new location
  const handleCreateLocation = () => {
    if (!newLocation.name || !newLocation.address || !newLocation.latitude || !newLocation.longitude) {
      toast({
        title: "Missing Information",
        description: "Please provide name, address, latitude, and longitude.",
        variant: "destructive",
      });
      return;
    }
    createLocationMutation.mutate(newLocation);
  };

  // Handle assigning a user to a location
  const handleAssignLocation = () => {
    if (!assignLocation.userId || !assignLocation.locationId) {
      toast({
        title: "Missing Information",
        description: "Please select both a user and a location.",
        variant: "destructive",
      });
      return;
    }
    assignLocationMutation.mutate(assignLocation);
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

  // Get username by ID
  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user ? user.username : "Unknown User";
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
      <h1 className="text-3xl font-bold mb-2">Attendance Administration</h1>
      <p className="text-muted-foreground mb-6">Manage work locations, assignments, and view attendance records</p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="locations">Work Locations</TabsTrigger>
          <TabsTrigger value="assignments">User Assignments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-3">
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Attendance Overview</CardTitle>
                    <CardDescription>All attendance records in the system</CardDescription>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="userFilter">Filter by User</Label>
                    <Select 
                      onValueChange={(value) => setSelectedUserId(value === "0" ? null : parseInt(value))}
                      value={selectedUserId?.toString() || "0"}
                    >
                      <SelectTrigger id="userFilter" className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">All Users</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="statusFilter">Status</Label>
                    <Select 
                      onValueChange={(value) => setStatusFilter(value)}
                      value={statusFilter}
                    >
                      <SelectTrigger id="statusFilter" className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="fromDate">From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full sm:w-[200px] justify-start text-left font-normal"
                          id="fromDate"
                        >
                          {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fromDate}
                          onSelect={setFromDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="toDate">To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full sm:w-[200px] justify-start text-left font-normal"
                          id="toDate"
                        >
                          {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={toDate}
                          onSelect={setToDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFromDate(undefined);
                        setToDate(undefined);
                        setStatusFilter("all");
                        setSelectedUserId(null);
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRecords ? (
                  <div className="text-center py-4">Loading records...</div>
                ) : attendanceRecords.length > 0 ? (
                  <>
                    {/* Mobile view */}
                    <div className="grid grid-cols-1 gap-4 sm:hidden">
                      {attendanceRecords
                        .filter(record => {
                          // Filter by user
                          const userMatch = selectedUserId ? record.userId === selectedUserId : true;
                          
                          // Filter by status
                          const statusMatch = statusFilter === "all" ? true : record.status === statusFilter;
                          
                          // Filter by date range
                          const recordDate = new Date(record.date);
                          const fromDateMatch = fromDate ? recordDate >= fromDate : true;
                          const toDateMatch = toDate ? recordDate <= toDate : true;
                          
                          return userMatch && statusMatch && fromDateMatch && toDateMatch;
                        })
                        .slice(0, 10)
                        .map((record) => (
                          <Card key={record.id} className="p-4">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium">{formatDate(record.date)}</div>
                              <div>{getStatusBadge(record.status, record.isWithinGeofence)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div className="flex flex-col">
                                <span className="text-muted-foreground">User:</span>
                                <span>{getUserName(record.userId)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-muted-foreground">Location:</span>
                                <span>{getLocationName(record.workLocationId)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-muted-foreground">Clock In:</span>
                                <span>{formatTime(record.clockInTime)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-muted-foreground">Clock Out:</span>
                                <span>{formatTime(record.clockOutTime)}</span>
                              </div>
                              <div className="flex flex-col col-span-2">
                                <span className="text-muted-foreground">Hours:</span>
                                <span>{record.totalHours?.toFixed(1) || "-"}</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                    
                    {/* Desktop view */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Clock In</TableHead>
                            <TableHead>Clock Out</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceRecords
                            .filter(record => {
                              // Filter by user
                              const userMatch = selectedUserId ? record.userId === selectedUserId : true;
                              
                              // Filter by status
                              const statusMatch = statusFilter === "all" ? true : record.status === statusFilter;
                              
                              // Filter by date range
                              const recordDate = new Date(record.date);
                              const fromDateMatch = fromDate ? recordDate >= fromDate : true;
                              const toDateMatch = toDate ? recordDate <= toDate : true;
                              
                              return userMatch && statusMatch && fromDateMatch && toDateMatch;
                            })
                            .slice(0, 20)
                            .map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>{formatDate(record.date)}</TableCell>
                                <TableCell>{getUserName(record.userId)}</TableCell>
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
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No attendance records found
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedUserId && (
              <>
                <Card className="md:col-span-3">
                  <CardHeader>
                    <CardTitle>User Statistics: {getUserName(selectedUserId)}</CardTitle>
                    <CardDescription>Attendance performance overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userStats ? (
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="text-3xl font-bold">{userStats.totalDays}</div>
                          <div className="text-sm text-muted-foreground">Total Days</div>
                        </div>
                        <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-lg">
                          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {userStats.presentDays}
                          </div>
                          <div className="text-sm text-muted-foreground">Present Days</div>
                        </div>
                        <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-lg">
                          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                            {userStats.absentDays}
                          </div>
                          <div className="text-sm text-muted-foreground">Absent Days</div>
                        </div>
                        <div className="bg-orange-100 dark:bg-orange-900/20 p-4 rounded-lg">
                          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                            {userStats.lateDays}
                          </div>
                          <div className="text-sm text-muted-foreground">Late Days</div>
                        </div>
                        <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {userStats.totalHours.toFixed(1)}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Hours</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No statistics available for this user
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* Work Locations Tab */}
        <TabsContent value="locations">
          <div className="grid grid-cols-1 gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Work Locations</h2>
              <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
                <DialogTrigger asChild>
                  <Button className="ml-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Work Location</DialogTitle>
                    <DialogDescription>
                      Create a new work location for attendance tracking
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={newLocation.name}
                        onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="address" className="text-right">
                        Address
                      </Label>
                      <Input
                        id="address"
                        value={newLocation.address}
                        onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={newLocation.description}
                        onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="latitude" className="text-right">
                        Latitude
                      </Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        value={newLocation.latitude}
                        onChange={(e) => setNewLocation({ ...newLocation, latitude: parseFloat(e.target.value) })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="longitude" className="text-right">
                        Longitude
                      </Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        value={newLocation.longitude}
                        onChange={(e) => setNewLocation({ ...newLocation, longitude: parseFloat(e.target.value) })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="radius" className="text-right">
                        Radius (m)
                      </Label>
                      <Input
                        id="radius"
                        type="number"
                        min="10"
                        max="5000"
                        value={newLocation.radius}
                        onChange={(e) => setNewLocation({ ...newLocation, radius: parseInt(e.target.value) })}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleCreateLocation} disabled={createLocationMutation.isPending}>
                      {createLocationMutation.isPending ? "Creating..." : "Create Location"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
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
                  <h3 className="text-lg font-medium mb-2">No Work Locations</h3>
                  <p>Create your first work location to start tracking attendance.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* User Assignments Tab */}
        <TabsContent value="assignments">
          <div className="grid grid-cols-1 gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">User Assignments</h2>
              <Dialog open={isAssigningLocation} onOpenChange={setIsAssigningLocation}>
                <DialogTrigger asChild>
                  <Button className="ml-auto">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign User to Location</DialogTitle>
                    <DialogDescription>
                      Assign a user to a work location for attendance tracking
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="userId" className="text-right">
                        User
                      </Label>
                      <Select
                        onValueChange={(value) => setAssignLocation({ ...assignLocation, userId: parseInt(value) })}
                        value={assignLocation.userId ? assignLocation.userId.toString() : undefined}
                      >
                        <SelectTrigger id="userId" className="col-span-3">
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="locationId" className="text-right">
                        Location
                      </Label>
                      <Select
                        onValueChange={(value) => setAssignLocation({ ...assignLocation, locationId: parseInt(value) })}
                        value={assignLocation.locationId ? assignLocation.locationId.toString() : undefined}
                      >
                        <SelectTrigger id="locationId" className="col-span-3">
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                        <SelectContent>
                          {workLocations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleAssignLocation} disabled={assignLocationMutation.isPending}>
                      {assignLocationMutation.isPending ? "Assigning..." : "Assign User"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User-Location Assignments</CardTitle>
                <CardDescription>Manage which users are assigned to which locations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-4">
                  This table will show all user-location assignments once we fetch that data. 
                  Currently, you can add assignments via the "Assign User" button above.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Attendance Reports</CardTitle>
                <CardDescription>Analyze attendance data for all users</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Responsive grid layout for report cards */}
                <div className="grid gap-6">
                  {/* First row - Present and Absent - will be side by side on all devices */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Present Today</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {attendanceRecords.filter(record => 
                            isToday(new Date(record.date)) && record.status === "present"
                          ).length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Absent Today</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {attendanceRecords.filter(record => 
                            isToday(new Date(record.date)) && record.status === "absent"
                          ).length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Second row - Late and Total - will be side by side on all devices */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Late Today</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {attendanceRecords.filter(record => 
                            isToday(new Date(record.date)) && record.status === "late"
                          ).length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Total Users</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{users.length}</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Attendance Summary</h3>
                  
                  {/* Responsive Table Design */}
                  <div className="grid grid-cols-1 gap-4 sm:hidden">
                    {users.map(user => {
                      const userRecords = attendanceRecords.filter(record => record.userId === user.id);
                      const presentCount = userRecords.filter(record => record.status === "present").length;
                      const absentCount = userRecords.filter(record => record.status === "absent").length;
                      const lateCount = userRecords.filter(record => record.status === "late").length;
                      const totalHours = userRecords.reduce((total, record) => total + (record.totalHours || 0), 0);
                      
                      return (
                        <Card key={user.id} className="p-4">
                          <div className="font-medium text-lg mb-2">{user.username}</div>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <span className="text-muted-foreground text-sm">Present:</span>
                              <span className="ml-2 font-medium">{presentCount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-sm">Absent:</span>
                              <span className="ml-2 font-medium">{absentCount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-sm">Late:</span>
                              <span className="ml-2 font-medium">{lateCount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-sm">Hours:</span>
                              <span className="ml-2 font-medium">{totalHours.toFixed(1)}</span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setActiveTab("dashboard");
                            }}
                          >
                            View Details
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Present</TableHead>
                          <TableHead>Absent</TableHead>
                          <TableHead>Late</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map(user => {
                          const userRecords = attendanceRecords.filter(record => record.userId === user.id);
                          const presentCount = userRecords.filter(record => record.status === "present").length;
                          const absentCount = userRecords.filter(record => record.status === "absent").length;
                          const lateCount = userRecords.filter(record => record.status === "late").length;
                          const totalHours = userRecords.reduce((total, record) => total + (record.totalHours || 0), 0);
                          
                          return (
                            <TableRow key={user.id}>
                              <TableCell>{user.username}</TableCell>
                              <TableCell>{presentCount}</TableCell>
                              <TableCell>{absentCount}</TableCell>
                              <TableCell>{lateCount}</TableCell>
                              <TableCell>{totalHours.toFixed(1)}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setActiveTab("dashboard");
                                  }}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAttendancePage;
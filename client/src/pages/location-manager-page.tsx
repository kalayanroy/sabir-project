import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
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
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  LogIn, 
  LogOut, 
  MapPin, 
  AlertCircle,
  ArrowLeft,
  Search,
  Filter,
  X,
  Home
} from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'login' | 'logout'>('all');
  
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
  
  // Filter locations based on search term and event type
  const filteredLocations = locationHistory 
    ? locationHistory.filter(location => {
        const matchesSearch = !searchTerm || 
          (location.username && location.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (location.email && location.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (location.ipAddress && location.ipAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (location.addressInfo?.city && location.addressInfo.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (location.addressInfo?.country && location.addressInfo.country.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesType = filterType === 'all' || location.eventType === filterType;
        
        return matchesSearch && matchesType;
      })
    : [];
    
  // Clear search and filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterType('all');
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
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                asChild 
                className="mr-2"
              >
                <Link href="/">
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back to Home</span>
                </Link>
              </Button>
              <CardTitle className="text-2xl flex items-center gap-2">
                <MapIcon className="h-6 w-6 text-primary" />
                Location Manager
              </CardTitle>
            </div>
            <CardDescription>User login and logout location tracking</CardDescription>
          </div>
          <Button size="sm" onClick={() => refetchLocations()}>Refresh</Button>
        </CardHeader>

        <CardContent>
          {/* Search and filter controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, location, IP..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear search</span>
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType !== 'all' ? "default" : "outline"}
                className="gap-1"
                onClick={() => setFilterType(filterType === 'all' ? 'login' : filterType === 'login' ? 'logout' : 'all')}
              >
                <Filter className="h-4 w-4" />
                {filterType === 'all' ? 'All Events' : filterType === 'login' ? 'Login Events' : 'Logout Events'}
              </Button>
              {(searchTerm || filterType !== 'all') && (
                <Button
                  variant="ghost"
                  className="gap-1"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {filteredLocations.length > 0 ? (
            <div className="border rounded-md overflow-auto">
              <Table>
                <TableCaption>User Login/Logout Location History</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">Event</TableHead>
                    <TableHead className="hidden md:table-cell">Time</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Latitude/Longitude</TableHead>
                    <TableHead className="hidden lg:table-cell">IP Address</TableHead>
                    <TableHead className="hidden xl:table-cell">Device Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div className="font-medium">{location.username || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{location.email}</div>
                        <div className="sm:hidden mt-1">
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
                        </div>
                        <div className="md:hidden mt-1 text-xs text-muted-foreground">
                          {formatDate(location.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
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
                      <TableCell className="hidden md:table-cell whitespace-nowrap">
                        {formatDate(location.timestamp)}
                      </TableCell>
                      <TableCell>
                        {location.latitude && location.longitude ? (
                          <div className="flex items-start gap-1">
                            <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              {location.addressInfo?.formatted || 
                                `${location.addressInfo?.city || ''} ${location.addressInfo?.state || ''} ${location.addressInfo?.country || ''}` || 
                                "Unknown location"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No location data</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {location.latitude && location.longitude ? (
                          <>
                            <div>{location.latitude.toFixed(6)}</div>
                            <div>{location.longitude.toFixed(6)}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <code className="text-xs">{location.ipAddress || "N/A"}</code>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell max-w-[200px]">
                        {location.deviceInfo ? (
                          <div className="text-xs space-y-1">
                            {(() => {
                              try {
                                const deviceData = JSON.parse(location.deviceInfo);
                                return (
                                  <>
                                    {deviceData.deviceModel && (
                                      <div><span className="font-medium">Model:</span> {deviceData.deviceModel}</div>
                                    )}
                                    {deviceData.deviceName && (
                                      <div><span className="font-medium">Name:</span> {deviceData.deviceName}</div>
                                    )}
                                    {deviceData.devicePlatform && (
                                      <div><span className="font-medium">Platform:</span> {deviceData.devicePlatform}</div>
                                    )}
                                    {deviceData.deviceId && (
                                      <div className="text-muted-foreground overflow-hidden text-ellipsis">
                                        <span className="font-medium">ID:</span> {deviceData.deviceId}
                                      </div>
                                    )}
                                  </>
                                );
                              } catch (e) {
                                return <span className="text-muted-foreground">{location.deviceInfo}</span>;
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-12 border rounded-md bg-muted/10">
              {locationHistory && locationHistory.length > 0 ? (
                <div>
                  <p className="text-lg font-medium mb-2">No locations match your filters</p>
                  <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria.</p>
                  <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
                </div>
              ) : (
                <div>
                  <MapIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No location history found</p>
                  <p className="text-muted-foreground">Location data will appear here when users log in or out.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
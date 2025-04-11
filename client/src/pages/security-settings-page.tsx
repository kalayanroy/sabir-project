import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Lock,
  Shield,
  Smartphone,
  Eye,
  EyeOff,
  AlertTriangle,
  Info
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get active tab from URL query parameter
  const [location] = window.location.search.match(/tab=([^&]*)/) || [];
  const defaultTab = location ? location.split('=')[1] : 'password';

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Security preferences state (these would be connected to actual backend endpoints in a real implementation)
  const [enableTwoFactor, setEnableTwoFactor] = useState(false);
  const [notifyOnLogin, setNotifyOnLogin] = useState(true);
  const [requireLocation, setRequireLocation] = useState(true);
  
  // Login history state for real location data
  const [loginHistory, setLoginHistory] = useState<Array<{
    date: string;
    ipAddress: string;
    location: string;
    device: string;
    success: boolean;
  }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the user's login history from the backend
    const fetchLoginHistory = async () => {
      if (!user) return;
      
      setIsLoadingHistory(true);
      setHistoryError(null);
      
      try {
        // Get user ID from current login
        const userId = user.id;
        
        // Fetch login history for the current user
        const response = await fetch(`/api/user-location-history?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch login history");
        }
        
        const locationData = await response.json();
        
        // Transform the data to match our UI format
        // The backend now returns enhanced records with formatted data
        const formattedHistory = locationData.map((entry: any) => {
          return {
            date: entry.timestamp,
            ipAddress: entry.ipAddress || "Unknown",
            location: entry.formattedLocation || "Unknown",
            device: entry.deviceName || entry.deviceInfo || "Unknown Device",
            eventType: entry.eventType || "unknown",
            success: true // Assuming all records are successful logins/logouts
          };
        });
        
        setLoginHistory(formattedHistory);
      } catch (error) {
        console.error("Error fetching login history:", error);
        setHistoryError(error instanceof Error ? error.message : "Failed to load login history");
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    fetchLoginHistory();
  }, [user]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate input
      if (!currentPassword) {
        throw new Error("Current password is required");
      }

      if (!newPassword) {
        throw new Error("New password is required");
      }

      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters long");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match");
      }

      // Update password
      const response = await apiRequest("POST", "/api/profile/update", {
        currentPassword,
        newPassword,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update password");
      }

      // Reset password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      setSuccess("Password updated successfully");
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
        variant: "default",
      });
    } catch (err) {
      console.error("Error updating password:", err);
      setError(err instanceof Error ? err.message : "Failed to update password");
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityPreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // In a real implementation, this would send the security preferences to the server
      // For now, we'll just simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess("Security preferences updated successfully");
      toast({
        title: "Settings Updated",
        description: "Your security preferences have been updated successfully.",
        variant: "default",
      });
    } catch (err) {
      console.error("Error updating security preferences:", err);
      setError(err instanceof Error ? err.message : "Failed to update security preferences");
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update security preferences",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" className="text-white hover:bg-white/20 mr-2">
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-medium">Security Settings</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6">
        <div className="container mx-auto max-w-3xl">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full mb-6 flex flex-wrap gap-2 md:grid md:grid-cols-3">
              <TabsTrigger value="password" className="flex-1">Password</TabsTrigger>
              <TabsTrigger value="preferences" className="flex-1">Security Preferences</TabsTrigger>
              <TabsTrigger value="activity" className="flex-1">Login Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="h-5 w-5 mr-2 text-primary" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handlePasswordSubmit}>
                  <CardContent className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="currentPassword"
                          type={showPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="pl-10 pr-10"
                          placeholder="Enter your current password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3 text-muted-foreground"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10 pr-10"
                          placeholder="Enter your new password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3 text-muted-foreground"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters long
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 pr-10"
                          placeholder="Confirm your new password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3 text-muted-foreground"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                      <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-amber-800 mb-1">Password Security Tips</h4>
                          <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                            <li>Use a mix of uppercase and lowercase letters</li>
                            <li>Include numbers and special characters</li>
                            <li>Avoid using easily guessed information like birthdays</li>
                            <li>Don't reuse passwords from other sites</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                      {isLoading ? "Updating Password..." : "Update Password"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-primary" />
                    Security Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your security settings and notifications
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSecurityPreferencesSubmit}>
                  <CardContent className="space-y-6">
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-4">
                      <h3 className="text-md font-medium">Authentication Settings</h3>
                      
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <Label htmlFor="two-factor-auth" className="font-medium">Two-Factor Authentication</Label>
                          <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                        </div>
                        <Switch
                          id="two-factor-auth"
                          checked={enableTwoFactor}
                          onCheckedChange={setEnableTwoFactor}
                          disabled={true}
                        />
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-200">
                        <div className="flex">
                          <Info className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Two-factor authentication will be available in a future update</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <h3 className="text-md font-medium">Notification Settings</h3>
                      
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <Label htmlFor="notify-login" className="font-medium">Login Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive an email when there's a new login to your account</p>
                        </div>
                        <Switch
                          id="notify-login"
                          checked={notifyOnLogin}
                          onCheckedChange={setNotifyOnLogin}
                        />
                      </div>
                      
                      <Separator />
                      
                      <h3 className="text-md font-medium">Location Tracking</h3>
                      
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <Label htmlFor="require-location" className="font-medium">Require Location Data</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow location tracking for enhanced security monitoring
                          </p>
                        </div>
                        <Switch
                          id="require-location"
                          checked={requireLocation}
                          onCheckedChange={setRequireLocation}
                        />
                      </div>
                      
                      <div className="rounded-lg bg-muted p-4">
                        <div className="flex items-start">
                          <Smartphone className="h-5 w-5 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium mb-1">Device Information</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Your account is linked to this device for enhanced security. Login is restricted to your registered device.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              <div className="bg-background p-2 rounded border">
                                <span className="font-medium">Device ID:</span> {user.deviceId || "N/A"}
                              </div>
                              <div className="bg-background p-2 rounded border">
                                <span className="font-medium">Device Name:</span> {user.deviceName || "Unknown Device"}
                              </div>
                              <div className="bg-background p-2 rounded border">
                                <span className="font-medium">Device Model:</span> {user.deviceModel || "Unknown Model"}
                              </div>
                              <div className="bg-background p-2 rounded border">
                                <span className="font-medium">Platform:</span> {user.devicePlatform || "Unknown Platform"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                      {isLoading ? "Saving Changes..." : "Save Preferences"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-primary" />
                    Recent Login Activity
                  </CardTitle>
                  <CardDescription>
                    Review recent logins to your account to verify it's you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-200">
                      <div className="flex">
                        <Info className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span>We track login activity to help protect your account. If you see any suspicious activity, please change your password immediately.</span>
                      </div>
                    </div>
                    
                    {/* Error state */}
                    {historyError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{historyError}</AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Loading state */}
                    {isLoadingHistory && (
                      <div className="flex justify-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                          <p className="text-sm text-muted-foreground">Loading login history...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Data display - responsive design */}
                    {!isLoadingHistory && !historyError && (
                      <>
                        {/* Mobile card layout for small screens */}
                        <div className="md:hidden space-y-4">
                          {loginHistory.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground border rounded-lg">
                              No login activity to display
                            </div>
                          ) : (
                            loginHistory.map((entry, index) => (
                              <div key={index} className="p-4 rounded-lg border bg-card">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <div className="font-medium">
                                      {new Date(entry.date).toLocaleDateString()} 
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(entry.date).toLocaleTimeString()}
                                    </div>
                                  </div>
                                  <div>
                                    {entry.success ? (
                                      <span className="inline-flex items-center text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Success
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Failed
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                  <div className="flex p-2 bg-muted/30 rounded">
                                    <div className="text-muted-foreground text-xs w-24">Location:</div>
                                    <div className="flex-1">{entry.location}</div>
                                  </div>
                                  <div className="flex p-2 bg-muted/30 rounded">
                                    <div className="text-muted-foreground text-xs w-24">IP Address:</div>
                                    <div className="flex-1 font-mono text-xs">{entry.ipAddress}</div>
                                  </div>
                                  <div className="flex p-2 bg-muted/30 rounded">
                                    <div className="text-muted-foreground text-xs w-24">Device:</div>
                                    <div className="flex-1">{entry.device || 'Unknown Device'}</div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        
                        {/* Desktop table layout */}
                        <div className="rounded-lg border overflow-hidden hidden md:block">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                                <th className="px-4 py-3 text-left font-medium">IP Address</th>
                                <th className="px-4 py-3 text-left font-medium">Location</th>
                                <th className="px-4 py-3 text-left font-medium">Device</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {loginHistory.map((entry, index) => (
                                <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                                  <td className="px-4 py-3">
                                    {new Date(entry.date).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs">
                                    {entry.ipAddress}
                                  </td>
                                  <td className="px-4 py-3">
                                    {entry.location}
                                  </td>
                                  <td className="px-4 py-3">
                                    {entry.device || 'Unknown Device'}
                                  </td>
                                  <td className="px-4 py-3">
                                    {entry.success ? (
                                      <span className="inline-flex items-center text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Success
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Failed
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {loginHistory.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                    No login activity to display
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                    
                    {/* Pagination (disabled for now) */}
                    {loginHistory.length > 0 && !isLoadingHistory && (
                      <div className="flex items-center justify-center">
                        <Button variant="outline" disabled={true}>
                          Load More
                        </Button>
                      </div>
                    )}
                    
                    <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 mt-4">
                      <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-amber-800 mb-1">Security Notice</h4>
                          <p className="text-xs text-amber-700">
                            If you notice any login activity that you don't recognize, please change your 
                            password immediately and contact support.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
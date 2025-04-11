import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, ChevronLeft, User, Mail, Smartphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Get active tab from URL query parameter
  const [location] = window.location.search.match(/tab=([^&]*)/) || [];
  const defaultTab = location ? location.split('=')[1] : 'basic-info';

  // Basic info state
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");

  // No longer need password change state here as it has been moved to the security settings page

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate input
      if (!username.trim()) {
        throw new Error("Username cannot be empty");
      }

      if (!email.trim()) {
        throw new Error("Email cannot be empty");
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      // Only send the request if there are changes
      if (username === user?.username && email === user?.email) {
        setSuccess("No changes to save");
        setIsLoading(false);
        return;
      }

      // Update user profile
      const response = await apiRequest("POST", "/api/profile/update", {
        username,
        email,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update profile");
      }

      const data = await response.json();
      
      // Update cached user data
      queryClient.setQueryData(["/api/user"], data.user);
      
      setSuccess("Profile updated successfully");
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
        variant: "default",
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Password functionality moved to security settings page

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
            <h1 className="text-xl font-medium">Edit Profile</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6">
        <div className="container mx-auto max-w-3xl">
          <Tabs defaultValue="basic-info" className="w-full">
            <TabsList className="grid w-full grid-cols-1 mb-6">
              <TabsTrigger value="basic-info">Basic Information</TabsTrigger>
            </TabsList>

            <TabsContent value="basic-info">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-primary" />
                    Edit Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your username and email address
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleBasicInfoSubmit}>
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
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-10"
                          placeholder="Your username"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          placeholder="Your email address"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start">
                        <Smartphone className="h-5 w-5 text-primary mt-0.5 mr-2" />
                        <div>
                          <h3 className="font-medium mb-1">Device Information</h3>
                          <p className="text-sm text-muted-foreground">
                            Your account is linked to this device and cannot be changed.
                          </p>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div className="bg-background p-2 rounded border">
                              <span className="font-medium">Device ID:</span> {user.deviceId || "N/A"}
                            </div>
                            <div className="bg-background p-2 rounded border">
                              <span className="font-medium">Device Name:</span> {user.deviceName || "Unknown"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-800 mb-1">Security Settings</h4>
                          <p className="text-xs text-blue-700 mb-2">
                            To manage your password and security preferences, please visit the Security Settings page.
                          </p>
                          <Link href="/security">
                            <Button variant="outline" size="sm" className="bg-white text-blue-700 border-blue-200 hover:bg-blue-50">
                              Go to Security Settings
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                      {isLoading ? "Saving Changes..." : "Save Changes"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* Password functionality moved to the Security Settings page */}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
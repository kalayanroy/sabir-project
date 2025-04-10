import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  LogOut, 
  User, 
  Settings, 
  HelpCircle, 
  Shield, 
  Edit, 
  Lock, 
  LogIn,
  ChevronRight,
  Smartphone,
  Info
} from "lucide-react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    // The logoutMutation will automatically attempt to get the user's location
    logoutMutation.mutate(undefined);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Lock className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-medium">SecureLogin</h1>
          </div>
          <div className="flex items-center">
            <div className="hidden md:block mr-4">
              <span className="text-sm">{user.email}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="hidden md:block w-64 bg-card shadow-md">
          <div className="p-4">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                <User className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            
            <nav>
              <ul className="space-y-1">
                <li>
                  <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                    <a href="#" className="flex items-center">
                      <User className="mr-3 h-5 w-5 text-primary" />
                      Dashboard
                    </a>
                  </Button>
                </li>
                {user.username === "admin1" && (
                  <li>
                    <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                      <a href="/admin" className="flex items-center">
                        <Shield className="mr-3 h-5 w-5 text-red-500" />
                        Admin Panel
                      </a>
                    </Button>
                  </li>
                )}
                <li>
                  <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                    <a href="#" className="flex items-center">
                      <Edit className="mr-3 h-5 w-5 text-muted-foreground" />
                      Profile
                    </a>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                    <a href="#" className="flex items-center">
                      <Settings className="mr-3 h-5 w-5 text-muted-foreground" />
                      Settings
                    </a>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                    <a href="#" className="flex items-center">
                      <HelpCircle className="mr-3 h-5 w-5 text-muted-foreground" />
                      Help
                    </a>
                  </Button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-6 bg-background">
          <div className="container mx-auto">
            <h2 className="text-2xl font-medium mb-6">Welcome Back, {user.username}!</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Account Information</h3>
                      <p className="text-muted-foreground mb-4">Manage your account details and preferences</p>
                      <Button variant="link" className="p-0 h-auto flex items-center text-primary">
                        <span>Edit Profile</span>
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Security Settings</h3>
                      <p className="text-muted-foreground mb-4">Update your password and security preferences</p>
                      <Button variant="link" className="p-0 h-auto flex items-center text-primary">
                        <span>Manage Security</span>
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Device Information */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <Smartphone className="h-6 w-6 text-primary mr-2" />
                  <h3 className="text-lg font-medium">Device Information</h3>
                </div>
                
                <div className="rounded-lg bg-muted/50 p-4 mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Device ID</p>
                      <p className="font-mono text-xs break-all bg-background p-2 rounded border">
                        {user.deviceId || "Not registered to a specific device"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Device Name</p>
                      <p className="font-medium">
                        {user.deviceName || "Unknown Device"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Device Model</p>
                      <p className="font-medium">
                        {user.deviceModel || "Unknown Model"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Platform</p>
                      <p className="font-medium">
                        {user.devicePlatform || "Unknown Platform"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center">
                    <Info className="h-4 w-4 text-muted-foreground mr-2" />
                    <p className="text-xs text-muted-foreground">
                      For security reasons, your account is linked to this device. You can only login from this device.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Admin Section - Only visible to admin users */}
            {user.username === "admin1" && (
              <Card className="mb-6 border border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Shield className="h-6 w-6 text-red-500 mr-2" />
                    <h3 className="text-lg font-medium">Admin Controls</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-md border border-red-100">
                      <h4 className="font-medium mb-2 text-red-800">Device Security Management</h4>
                      <p className="text-sm text-red-700 mb-4">
                        As an administrator, you can manage device blocking, review unblock requests, 
                        and monitor security policies.
                      </p>
                      <Button 
                        variant="outline" 
                        className="bg-white border-red-200 text-red-700 hover:bg-red-50"
                        asChild
                      >
                        <a href="/admin" className="flex items-center">
                          <Shield className="mr-2 h-4 w-4" />
                          Go to Admin Dashboard
                        </a>
                      </Button>
                    </div>
                    
                    <div className="rounded-md bg-amber-50 p-4 border border-amber-100">
                      <h4 className="font-medium mb-2 text-amber-800">Security Notice</h4>
                      <p className="text-sm text-amber-700">
                        Remember that only administrators should have access to the device management console. 
                        Do not share your admin credentials with others.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
                      <LogIn className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Successful login</p>
                      <p className="text-sm text-muted-foreground">Today, 10:30 AM</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                      <Edit className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Profile updated</p>
                      <p className="text-sm text-muted-foreground">Yesterday, 2:15 PM</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
                      <Lock className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">Password changed</p>
                      <p className="text-sm text-muted-foreground">Dec 10, 2023, 9:45 AM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

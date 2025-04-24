import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
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
  Info,
  Menu,
  X
} from "lucide-react";
// Import Map icon separately to avoid conflict with built-in Map object
import { Map as MapIcon } from "lucide-react";
// Import Clock icon for attendance pages
import { Clock, ClipboardList, Calendar } from "lucide-react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleLogout = () => {
    // The logoutMutation will automatically attempt to get the user's location
    logoutMutation.mutate(undefined);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-white mr-2 hover:bg-white/20"
              onClick={toggleMobileMenu}
            >
              <Menu className="h-5 w-5" />
            </Button>
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
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full w-64 bg-card shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center">
            <Lock className="h-5 w-5 mr-2 text-primary" />
            <h2 className="font-medium">SecureLogin</h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
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
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal" 
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <a href="#" className="flex items-center">
                    <User className="mr-3 h-5 w-5 text-primary" />
                    Dashboard
                  </a>
                </Button>
              </li>
              {(user.username === "admin1" || user.username === "admin") && (
                <>
                  <li>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start font-normal" 
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <a href="/admin" className="flex items-center">
                        <Shield className="mr-3 h-5 w-5 text-red-500" />
                        Device Manager
                      </a>
                    </Button>
                  </li>
                  <li>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start font-normal" 
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <a href="/user-admin" className="flex items-center">
                        <User className="mr-3 h-5 w-5 text-green-600" />
                        User Management
                      </a>
                    </Button>
                  </li>
                  <li>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start font-normal" 
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <a href="/location-manager" className="flex items-center">
                        <MapIcon className="mr-3 h-5 w-5 text-blue-500" />
                        Location Manager
                      </a>
                    </Button>
                  </li>
                  <li>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start font-normal" 
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <a href="/admin-attendance" className="flex items-center">
                        <ClipboardList className="mr-3 h-5 w-5 text-purple-500" />
                        Attendance Admin
                      </a>
                    </Button>
                  </li>
                </>
              )}
              
              <li>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal" 
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <a href="/attendance" className="flex items-center">
                    <Clock className="mr-3 h-5 w-5 text-emerald-500" />
                    Attendance
                  </a>
                </Button>
              </li>
              <li>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal" 
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <a href="/leave" className="flex items-center">
                    <Calendar className="mr-3 h-5 w-5 text-amber-500" />
                    Leave Management
                  </a>
                </Button>
              </li>
              {(user.username === "admin1" || user.username === "admin") && (
                <li>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start font-normal" 
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <a href="/admin-leave" className="flex items-center">
                      <Calendar className="mr-3 h-5 w-5 text-orange-500" />
                      Leave Admin
                    </a>
                  </Button>
                </li>
              )}
              <li>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal" 
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <a href="/profile" className="flex items-center">
                    <Edit className="mr-3 h-5 w-5 text-muted-foreground" />
                    Profile
                  </a>
                </Button>
              </li>
              <li>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal" 
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <a href="/security" className="flex items-center">
                    <Settings className="mr-3 h-5 w-5 text-muted-foreground" />
                    Security Settings
                  </a>
                </Button>
              </li>
              <li>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start font-normal" 
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <a href="/help" className="flex items-center">
                    <HelpCircle className="mr-3 h-5 w-5 text-muted-foreground" />
                    Help
                  </a>
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
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
                {(user.username === "admin1" || user.username === "admin") && (
                  <>
                    <li>
                      <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                        <a href="/admin" className="flex items-center">
                          <Shield className="mr-3 h-5 w-5 text-red-500" />
                          Device Manager
                        </a>
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                        <a href="/user-admin" className="flex items-center">
                          <User className="mr-3 h-5 w-5 text-green-600" />
                          User Management
                        </a>
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                        <a href="/location-manager" className="flex items-center">
                          <MapIcon className="mr-3 h-5 w-5 text-blue-500" />
                          Location Manager
                        </a>
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                        <a href="/admin-attendance" className="flex items-center">
                          <ClipboardList className="mr-3 h-5 w-5 text-purple-500" />
                          Attendance Admin
                        </a>
                      </Button>
                    </li>
                  </>
                )}
                
                <li>
                  <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                    <a href="/attendance" className="flex items-center">
                      <Clock className="mr-3 h-5 w-5 text-emerald-500" />
                      Attendance
                    </a>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                    <a href="/leave" className="flex items-center">
                      <Calendar className="mr-3 h-5 w-5 text-amber-500" />
                      Leave Management
                    </a>
                  </Button>
                </li>
                {(user.username === "admin1" || user.username === "admin") && (
                  <li>
                    <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                      <a href="/admin-leave" className="flex items-center">
                        <Calendar className="mr-3 h-5 w-5 text-orange-500" />
                        Leave Admin
                      </a>
                    </Button>
                  </li>
                )}
                <li>
                  <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                    <a href="/profile" className="flex items-center">
                      <Edit className="mr-3 h-5 w-5 text-muted-foreground" />
                      Profile
                    </a>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                    <a href="/security" className="flex items-center">
                      <Settings className="mr-3 h-5 w-5 text-muted-foreground" />
                      Security Settings
                    </a>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start font-normal" asChild>
                    <a href="/help" className="flex items-center">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Account Information</h3>
                      <p className="text-muted-foreground mb-4">Manage your account details and preferences</p>
                      <Button variant="link" className="p-0 h-auto flex items-center text-primary" asChild>
                        <a href="/profile">
                          <span>Edit Profile</span>
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </a>
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
                      <Button variant="link" className="p-0 h-auto flex items-center text-primary" asChild>
                        <a href="/security">
                          <span>Manage Security</span>
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mr-4">
                      <Clock className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Attendance</h3>
                      <p className="text-muted-foreground mb-4">Track your work hours and attendance records</p>
                      <Button variant="link" className="p-0 h-auto flex items-center text-primary" asChild>
                        <a href="/attendance">
                          <span>Manage Attendance</span>
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center mr-4">
                      <Calendar className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Leave Management</h3>
                      <p className="text-muted-foreground mb-4">Request and track time off from work</p>
                      <Button variant="link" className="p-0 h-auto flex items-center text-primary" asChild>
                        <a href="/leave">
                          <span>Request Leave</span>
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </a>
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
            {(user.username === "admin1" || user.username === "admin") && (
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
                          Go to Device Manager
                        </a>
                      </Button>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-md border border-green-100">
                      <h4 className="font-medium mb-2 text-green-800">User Role Management</h4>
                      <p className="text-sm text-green-700 mb-4">
                        Manage user roles and permissions. Assign admin privileges to trusted users
                        who need to access administrative features.
                      </p>
                      <Button 
                        variant="outline" 
                        className="bg-white border-green-200 text-green-700 hover:bg-green-50"
                        asChild
                      >
                        <a href="/user-admin" className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          Go to User Management
                        </a>
                      </Button>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                      <h4 className="font-medium mb-2 text-blue-800">Location Tracking Management</h4>
                      <p className="text-sm text-blue-700 mb-4">
                        View and analyze user login/logout location data, including geographic coordinates 
                        and address information for enhanced security monitoring.
                      </p>
                      <Button 
                        variant="outline" 
                        className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                        asChild
                      >
                        <a href="/location-manager" className="flex items-center">
                          <MapIcon className="mr-2 h-4 w-4" />
                          Go to Location Manager
                        </a>
                      </Button>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-md border border-purple-100">
                      <h4 className="font-medium mb-2 text-purple-800">Attendance Management</h4>
                      <p className="text-sm text-purple-700 mb-4">
                        Manage work locations, track employee attendance, and generate attendance reports.
                        Set up geofencing and monitor employee work hours.
                      </p>
                      <Button 
                        variant="outline" 
                        className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50"
                        asChild
                      >
                        <a href="/admin-attendance" className="flex items-center">
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Go to Attendance Admin
                        </a>
                      </Button>
                    </div>
                    
                    <div className="bg-amber-50 p-4 rounded-md border border-amber-100">
                      <h4 className="font-medium mb-2 text-amber-800">Leave Management</h4>
                      <p className="text-sm text-amber-700 mb-4">
                        Review, approve, and manage employee leave requests. Create and configure leave types
                        and manage leave balances for all employees.
                      </p>
                      <Button 
                        variant="outline" 
                        className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50"
                        asChild
                      >
                        <a href="/admin-leave" className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          Go to Leave Admin
                        </a>
                      </Button>
                    </div>
                    
                    <div className="rounded-md bg-gray-50 p-4 border border-gray-100">
                      <h4 className="font-medium mb-2 text-gray-800">Security Notice</h4>
                      <p className="text-sm text-gray-700">
                        Remember that only administrators should have access to the management consoles. 
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
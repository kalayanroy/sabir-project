import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut,
  User,
  Settings,
  HelpCircle,
  Shield,
  Edit,
  Lock,
  Search,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
} from "lucide-react";
// Import Map icon separately to avoid conflict with built-in Map object
import { Map as MapIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

type SafeUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  deviceId?: string;
  deviceName?: string;
  deviceModel?: string;
  devicePlatform?: string;
};

export default function UserAdminPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const handleLogout = () => {
    logoutMutation.mutate(undefined);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Query to fetch all users
  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      return await res.json();
    },
  });

  // Mutation to update user role
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string }) => {
      const res = await apiRequest("POST", "/api/admin/update-user-role", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update user role");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: `User role has been updated successfully.`,
        variant: "default",
      });

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSelectedUser(null);
      setSelectedRole("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(
    (user: SafeUser) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
  };

  const handleUpdateRole = () => {
    if (!selectedUser || !selectedRole) return;

    // Don't update if the role is the same
    if (selectedUser.role === selectedRole) {
      toast({
        title: "No Changes",
        description: "The selected role is the same as the current role.",
        variant: "default",
      });
      return;
    }

    updateRoleMutation.mutate({
      userId: selectedUser.id,
      role: selectedRole,
    });
  };

  const selectUser = (user: SafeUser) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
  };

  if (!user) return null;

  // Only allow admin access
  if (user.username !== "admin" && user.username !== "admin1") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-6">
              You don't have permission to access this page. Only administrators
              can manage users.
            </p>
            <div className="flex justify-center">
              <Button asChild>
                <Link href="/">Return to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
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
                  <a href="/" className="flex items-center">
                    <User className="mr-3 h-5 w-5 text-primary" />
                    Dashboard
                  </a>
                </Button>
              </li>
              {(user.username === "admin" || user.username === "admin1") && (
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
                      className="w-full justify-start font-normal bg-muted"
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <a href="/user-admin" className="flex items-center">
                        <UserCheck className="mr-3 h-5 w-5 text-green-600" />
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
                </>
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
                  <Button
                    variant="ghost"
                    className="w-full justify-start font-normal"
                    asChild
                  >
                    <a href="/" className="flex items-center">
                      <User className="mr-3 h-5 w-5 text-primary" />
                      Dashboard
                    </a>
                  </Button>
                </li>
                {(user.username === "admin" || user.username === "admin1") && (
                  <>
                    <li>
                      <Button
                        variant="ghost"
                        className="w-full justify-start font-normal"
                        asChild
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
                        className="w-full justify-start font-normal bg-muted"
                        asChild
                      >
                        <a href="/user-admin" className="flex items-center">
                          <UserCheck className="mr-3 h-5 w-5 text-green-600" />
                          User Management
                        </a>
                      </Button>
                    </li>
                    <li>
                      <Button
                        variant="ghost"
                        className="w-full justify-start font-normal"
                        asChild
                      >
                        <a
                          href="/location-manager"
                          className="flex items-center"
                        >
                          <MapIcon className="mr-3 h-5 w-5 text-blue-500" />
                          Location Manager
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

        {/* Content Area */}
        <div className="flex-1 p-6 bg-background">
          <div className="container mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <div className="flex items-center mb-4 sm:mb-0">
                <UserCheck className="h-6 w-6 text-green-600 mr-3" />
                <h2 className="text-2xl font-medium">User Management</h2>
              </div>
              <div className="flex items-center">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search users..."
                    className="pl-10 w-full sm:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="h-5 w-5 mr-2 text-muted-foreground" />
                      User List
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center items-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : error ? (
                      <div className="text-center text-red-500 p-4">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                        <p>Failed to load users</p>
                      </div>
                    ) : (
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Emp. ID</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center">
                                  No users found
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredUsers.map((user: SafeUser) => (
                                <TableRow
                                  key={user.id}
                                  className={
                                    selectedUser?.id === user.id
                                      ? "bg-muted"
                                      : ""
                                  }
                                >
                                  <TableCell className="font-medium">
                                    {user.username}
                                  </TableCell>
                                  <TableCell>{user.empId}</TableCell>
                                  <TableCell>{user.email}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        user.role === "admin"
                                          ? "default"
                                          : "outline"
                                      }
                                    >
                                      {user.role}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => selectUser(user)}
                                    >
                                      {selectedUser?.id === user.id
                                        ? "Selected"
                                        : "Select"}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Edit className="h-5 w-5 mr-2 text-muted-foreground" />
                      User Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedUser ? (
                      <div className="text-center p-6 text-muted-foreground">
                        <UserX className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Select a user to manage their settings</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center mb-6">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">
                              {selectedUser.username}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {selectedUser.email}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            User Role
                          </label>
                          <div className="flex items-center gap-4">
                            <Select
                              value={selectedRole}
                              onValueChange={handleRoleChange}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {selectedRole === "admin"
                              ? "Admin users can access administrative features and bypass device binding."
                              : "Regular users are bound to their registered device and have limited access."}
                          </p>
                        </div>

                        <div className="pt-4">
                          <Button
                            className="w-full"
                            disabled={
                              !selectedRole ||
                              selectedRole === selectedUser.role ||
                              updateRoleMutation.isPending
                            }
                            onClick={handleUpdateRole}
                          >
                            {updateRoleMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-background mr-2"></div>
                                Updating...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Update Role
                              </>
                            )}
                          </Button>
                        </div>

                        <Separator />

                        <div className="bg-muted p-3 rounded-md">
                          <h4 className="font-medium mb-2">
                            Device Information
                          </h4>
                          <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Device ID:
                              </span>
                              <span className="font-mono">
                                {selectedUser.deviceId || "Not registered"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Device Type:
                              </span>
                              <span>
                                {selectedUser.deviceName || "Unknown"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Platform:
                              </span>
                              <span>
                                {selectedUser.devicePlatform || "Unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

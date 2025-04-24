import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin-page";
import UserAdminPage from "@/pages/user-admin-page";
import LocationManagerPage from "@/pages/location-manager-page";
import ProfilePage from "@/pages/profile-page";
import SecuritySettingsPage from "@/pages/security-settings-page";
import HelpPage from "@/pages/help-page";
import AttendancePage from "@/pages/attendance-page";
import AdminAttendancePage from "@/pages/admin-attendance-page";
import LeavePage from "@/pages/leave-page";
import AdminLeavePage from "@/pages/admin-leave-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/user-admin" component={UserAdminPage} />
      <ProtectedRoute path="/location-manager" component={LocationManagerPage} />
      <ProtectedRoute path="/attendance" component={AttendancePage} />
      <ProtectedRoute path="/admin-attendance" component={AdminAttendancePage} />
      <ProtectedRoute path="/leave" component={LeavePage} />
      <ProtectedRoute path="/admin-leave" component={AdminLeavePage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/security" component={SecuritySettingsPage} />
      <ProtectedRoute path="/help" component={HelpPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

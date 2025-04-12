import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getAllUsersLocationHistory, getUserLocationHistory } from "./locationService";
import { 
  clockIn, 
  clockOut, 
  createWorkLocation, 
  getAllAttendance, 
  getAllWorkLocations, 
  getUserAttendance, 
  getUserWorkLocations, 
  getUserWorkStats,
  assignUserToWorkLocation
} from "./attendanceService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Admin routes
  app.get("/api/admin/location-history", async (req: Request, res: Response) => {
    try {
      // Debug directly to console.error for visibility
      console.error("============= ADMIN LOCATION HISTORY DEBUG =============");
      console.error(`Is authenticated: ${req.isAuthenticated()}`);
      
      if (!req.isAuthenticated()) {
        console.error("User not authenticated - returning 403");
        return res.status(403).json({ message: "Unauthorized access - not authenticated" });
      }
      
      console.error(`Username: "${req.user.username}"`);
      console.error(`Role: "${req.user.role}"`);
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error(`Is role admin? ${req.user.role === "admin"}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.role !== "admin" && req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" and role is "${req.user.role}" (not admin)`);
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }

      const locationHistory = await getAllUsersLocationHistory();
      res.json(locationHistory);
    } catch (error) {
      console.error("Error fetching location history:", error);
      res.status(500).json({ message: "Failed to fetch location history" });
    }
  });
  
  // Get all blocked devices (for admin)
  app.get("/api/admin/blocked-devices", async (req: Request, res: Response) => {
    try {
      // Debug directly to console.error for visibility
      console.error("============= ADMIN ACCESS DEBUG =============");
      console.error(`Is authenticated: ${req.isAuthenticated()}`);
      
      if (!req.isAuthenticated()) {
        console.error("User not authenticated - returning 403");
        return res.status(403).json({ message: "Unauthorized access - not authenticated" });
      }
      
      console.error(`User object: ${JSON.stringify(req.user, null, 2)}`);
      console.error(`Username: "${req.user.username}"`);
      console.error(`Role: "${req.user.role}"`);
      console.error(`Username type: ${typeof req.user.username}`);
      console.error(`Username length: ${req.user.username.length}`);
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error(`Is role admin? ${req.user.role === "admin"}`);
      console.error(`Username char codes: ${Array.from(req.user.username).map(c => c.charCodeAt(0))}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.role !== "admin" && req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" and role is "${req.user.role}" (not admin)`);
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }
      
      // Get blocked devices from storage
      const blockedDevices = await storage.getBlockedDevices();
      res.json(blockedDevices);
    } catch (error) {
      console.error("Error fetching blocked devices:", error);
      res.status(500).json({ message: "Failed to fetch blocked devices" });
    }
  });
  
  // Unblock a device (admin only)
  app.post("/api/admin/unblock-device", async (req: Request, res: Response) => {
    try {
      // Debug directly to console.error for visibility
      console.error("============= ADMIN UNBLOCK DEBUG =============");
      console.error(`Is authenticated: ${req.isAuthenticated()}`);
      
      if (!req.isAuthenticated()) {
        console.error("User not authenticated - returning 403");
        return res.status(403).json({ message: "Unauthorized access - not authenticated" });
      }
      
      console.error(`Username: "${req.user.username}"`);
      console.error(`Role: "${req.user.role}"`);
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error(`Is role admin? ${req.user.role === "admin"}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.role !== "admin" && req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" and role is "${req.user.role}" (not admin)`);
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }
      
      const { deviceId } = req.body;
      if (!deviceId) {
        return res.status(400).json({ message: "Device ID is required" });
      }
      
      const unblocked = await storage.unblockDevice(deviceId);
      if (!unblocked) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json({ message: "Device successfully unblocked" });
    } catch (error) {
      console.error("Error unblocking device:", error);
      res.status(500).json({ message: "Failed to unblock device" });
    }
  });
  
  // Reject unblock request (admin only)
  app.post("/api/admin/reject-unblock-request", async (req: Request, res: Response) => {
    try {
      // Debug directly to console.error for visibility
      console.error("============= ADMIN REJECT DEBUG =============");
      console.error(`Is authenticated: ${req.isAuthenticated()}`);
      
      if (!req.isAuthenticated()) {
        console.error("User not authenticated - returning 403");
        return res.status(403).json({ message: "Unauthorized access - not authenticated" });
      }
      
      console.error(`Username: "${req.user.username}"`);
      console.error(`Role: "${req.user.role}"`);
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error(`Is role admin? ${req.user.role === "admin"}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.role !== "admin" && req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" and role is "${req.user.role}" (not admin)`);
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }
      
      const { deviceId, reason } = req.body;
      if (!deviceId || !reason) {
        return res.status(400).json({ message: "Device ID and rejection reason are required" });
      }
      
      // Call the function from deviceAttemptActions.ts
      await storage.rejectUnblockRequest(deviceId, reason);
      
      res.json({ message: "Unblock request rejected successfully" });
    } catch (error) {
      console.error("Error rejecting unblock request:", error);
      res.status(500).json({ message: "Failed to reject unblock request" });
    }
  });

  // Update user profile
  app.post("/api/profile/update", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const { username, email, currentPassword, newPassword } = req.body;
      
      // Get the current user to verify password if needed
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prepare update data
      const updateData: Partial<typeof currentUser> = {};
      
      // Validate username update
      if (username && username !== currentUser.username) {
        // Check if username already exists
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
        updateData.username = username;
      }
      
      // Validate email update
      if (email && email !== currentUser.email) {
        // Check if email already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use" });
        }
        updateData.email = email;
      }
      
      // Handle password update if provided
      if (newPassword) {
        // Verify current password before updating
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to set a new password" });
        }
        
        // Import the password comparison function from auth.ts
        const { comparePasswords, hashPassword } = await import('./auth');
        
        // Verify current password
        const isPasswordValid = await comparePasswords(currentPassword, currentUser.password);
        if (!isPasswordValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
        
        // Hash new password
        updateData.password = await hashPassword(newPassword);
      }
      
      // Update user if there are changes
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No changes to update" });
      }
      
      // Perform update
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update profile" });
      }
      
      // Return updated user without password
      const { password, ...userData } = updatedUser;
      res.json({
        success: true,
        message: "Profile updated successfully",
        user: userData
      });
      
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // Get location history for a specific user
  app.get("/api/user-location-history", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get the user ID from the query parameter
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : req.user.id;
      
      // Security check - regular users can only view their own history
      // Admin users can view any user's history
      if (req.user.id !== userId && req.user.role !== "admin" && req.user.username !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only view your own login history" });
      }
      
      // Get the user's location history
      const locationHistory = await getUserLocationHistory(userId);
      
      res.json(locationHistory);
    } catch (error) {
      console.error("Error fetching user location history:", error);
      res.status(500).json({ message: "Failed to fetch location history" });
    }
  });
  
  // Get all users (admin only)
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      // Debug directly to console.error for visibility
      console.error("============= ADMIN GET USERS DEBUG =============");
      console.error(`Is authenticated: ${req.isAuthenticated()}`);
      
      if (!req.isAuthenticated()) {
        console.error("User not authenticated - returning 403");
        return res.status(403).json({ message: "Unauthorized access - not authenticated" });
      }
      
      console.error(`Username: "${req.user.username}"`);
      console.error(`Role: "${req.user.role}"`);
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error(`Is role admin? ${req.user.role === "admin"}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.role !== "admin" && req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" and role is "${req.user.role}" (not admin)`);
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }
      
      const users = await storage.getAllUsers();
      
      // Don't send password hashes to the client
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Update user role (admin only)
  app.post("/api/admin/update-user-role", async (req: Request, res: Response) => {
    try {
      // Debug directly to console.error for visibility
      console.error("============= ADMIN UPDATE ROLE DEBUG =============");
      console.error(`Is authenticated: ${req.isAuthenticated()}`);
      
      if (!req.isAuthenticated()) {
        console.error("User not authenticated - returning 403");
        return res.status(403).json({ message: "Unauthorized access - not authenticated" });
      }
      
      console.error(`Username: "${req.user.username}"`);
      console.error(`Role: "${req.user.role}"`);
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error(`Is role admin? ${req.user.role === "admin"}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.role !== "admin" && req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" and role is "${req.user.role}" (not admin)`);
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }
      
      const { userId, role } = req.body;
      
      if (!userId || !role || (role !== "user" && role !== "admin")) {
        return res.status(400).json({ message: "Valid user ID and role (user or admin) required" });
      }
      
      const updatedUser = await storage.updateUserRole(userId, role);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password hash to the client
      const { password, ...safeUser } = updatedUser;
      
      res.json({
        success: true,
        message: `User role updated to ${role} successfully`,
        user: safeUser
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // ATTENDANCE MANAGEMENT API ENDPOINTS
  
  // Clock in
  app.post("/api/attendance/clock-in", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ 
          message: "Latitude and longitude are required for clock-in"
        });
      }
      
      const result = await clockIn(req.user.id, latitude, longitude);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error during clock-in:", error);
      res.status(500).json({ message: "Failed to clock in" });
    }
  });
  
  // Clock out
  app.post("/api/attendance/clock-out", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ 
          message: "Latitude and longitude are required for clock-out"
        });
      }
      
      const result = await clockOut(req.user.id, latitude, longitude);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error during clock-out:", error);
      res.status(500).json({ message: "Failed to clock out" });
    }
  });
  
  // Get user's attendance records
  app.get("/api/attendance/records", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
      }
      
      const records = await getUserAttendance(req.user.id, startDate, endDate, limit);
      
      res.json(records);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });
  
  // Get user work statistics
  app.get("/api/attendance/stats", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
      }
      
      const stats = await getUserWorkStats(req.user.id, startDate, endDate);
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching work statistics:", error);
      res.status(500).json({ message: "Failed to fetch work statistics" });
    }
  });
  
  // Get user's assigned work locations
  app.get("/api/attendance/work-locations", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const locations = await getUserWorkLocations(req.user.id);
      
      res.json(locations);
    } catch (error) {
      console.error("Error fetching work locations:", error);
      res.status(500).json({ message: "Failed to fetch work locations" });
    }
  });
  
  // ADMIN ATTENDANCE MANAGEMENT ENDPOINTS
  
  // Get all attendance records (admin only)
  app.get("/api/admin/attendance/records", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || (req.user.role !== "admin" && req.user.username !== "admin")) {
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
      }
      
      const records = await getAllAttendance(startDate, endDate, limit);
      
      res.json(records);
    } catch (error) {
      console.error("Error fetching all attendance records:", error);
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });
  
  // Get user statistics (admin only)
  app.get("/api/admin/attendance/user-stats/:userId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || (req.user.role !== "admin" && req.user.username !== "admin")) {
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }
      
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
      }
      
      const stats = await getUserWorkStats(userId, startDate, endDate);
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user work statistics:", error);
      res.status(500).json({ message: "Failed to fetch work statistics" });
    }
  });
  
  // Create new work location (admin only)
  app.post("/api/admin/attendance/work-locations", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || (req.user.role !== "admin" && req.user.username !== "admin")) {
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }
      
      const { name, description, address, latitude, longitude, radius } = req.body;
      
      if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ 
          message: "Name, address, latitude, and longitude are required" 
        });
      }
      
      const newLocation = await createWorkLocation({
        name,
        description,
        address,
        latitude,
        longitude,
        radius: radius || 100
      });
      
      res.status(201).json(newLocation);
    } catch (error) {
      console.error("Error creating work location:", error);
      res.status(500).json({ message: "Failed to create work location" });
    }
  });
  
  // Get all work locations (admin only)
  app.get("/api/admin/attendance/work-locations", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || (req.user.role !== "admin" && req.user.username !== "admin")) {
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }
      
      const locations = await getAllWorkLocations();
      
      res.json(locations);
    } catch (error) {
      console.error("Error fetching work locations:", error);
      res.status(500).json({ message: "Failed to fetch work locations" });
    }
  });
  
  // Assign user to work location (admin only)
  app.post("/api/admin/attendance/assign-location", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || (req.user.role !== "admin" && req.user.username !== "admin")) {
        return res.status(403).json({ message: "Unauthorized access - not admin" });
      }
      
      const { userId, locationId } = req.body;
      
      if (!userId || !locationId) {
        return res.status(400).json({ 
          message: "User ID and location ID are required" 
        });
      }
      
      const success = await assignUserToWorkLocation(userId, locationId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to assign user to location" });
      }
      
      res.json({ 
        success: true, 
        message: "User successfully assigned to work location" 
      });
    } catch (error) {
      console.error("Error assigning user to work location:", error);
      res.status(500).json({ message: "Failed to assign user to work location" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

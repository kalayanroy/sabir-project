import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getAllUsersLocationHistory, getUserLocationHistory } from "./locationService";

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
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" not "admin"`);
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
      console.error(`Username type: ${typeof req.user.username}`);
      console.error(`Username length: ${req.user.username.length}`);
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error(`Is username ADMIN? ${req.user.username.toLowerCase() === "admin"}`);
      console.error(`Username char codes: ${Array.from(req.user.username).map(c => c.charCodeAt(0))}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" not "admin"`);
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
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" not "admin"`);
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
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" not "admin"`);
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
      if (req.user.id !== userId && req.user.username !== "admin") {
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
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" not "admin"`);
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
      console.error(`Is username admin? ${req.user.username === "admin"}`);
      console.error("=============================================");
      
      // Check if user is admin with detailed error
      if (req.user.username !== "admin") {
        console.error(`Admin check failed - username is "${req.user.username}" not "admin"`);
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

  const httpServer = createServer(app);

  return httpServer;
}

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getAllUsersLocationHistory } from "./locationService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Admin routes
  app.get("/api/admin/location-history", async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (!req.isAuthenticated() || req.user?.username !== "admin1") {
        return res.status(403).json({ message: "Unauthorized access" });
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
      // Check if user is admin
      if (!req.isAuthenticated() || req.user?.username !== "admin1") {
        return res.status(403).json({ message: "Unauthorized access" });
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
      // Check if user is admin
      if (!req.isAuthenticated() || req.user?.username !== "admin1") {
        return res.status(403).json({ message: "Unauthorized access" });
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
      // Check if user is admin
      if (!req.isAuthenticated() || req.user?.username !== "admin1") {
        return res.status(403).json({ message: "Unauthorized access" });
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

  const httpServer = createServer(app);

  return httpServer;
}

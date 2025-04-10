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

  const httpServer = createServer(app);

  return httpServer;
}

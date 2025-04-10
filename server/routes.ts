import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Any other application routes would go here
  // prefix all routes with /api

  const httpServer = createServer(app);

  return httpServer;
}

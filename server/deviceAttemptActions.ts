import { deviceAttempts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";

// Update device attempt statuses for tracking blocked devices and unblock requests
export const deviceAttemptActions = {
  // Mark an unblock request as rejected
  async rejectUnblockRequest(deviceId: string, rejectionReason: string) {
    const deviceAttempt = await storage.getDeviceAttempt(deviceId);
    
    if (!deviceAttempt) {
      throw new Error("Device not found");
    }
    
    if (!deviceAttempt.isBlocked) {
      throw new Error("This device is not blocked");
    }
    
    const [updated] = await db
      .update(deviceAttempts)
      .set({
        unblockRequestSent: false,
        blockReason: `${deviceAttempt.blockReason || "Registration attempts"} (Request rejected: ${rejectionReason})`,
      })
      .where(eq(deviceAttempts.deviceId, deviceId))
      .returning();
    
    return updated;
  },
  
  // Get all unblock requests
  async getUnblockRequests() {
    const requests = await db.query.deviceAttempts.findMany({
      where: (fields, { and, eq }) => 
        and(
          eq(fields.isBlocked, true),
          eq(fields.unblockRequestSent, true)
        )
    });
    
    return requests;
  }
};
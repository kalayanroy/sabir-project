import {
  users,
  deviceAttempts,
  type User,
  type InsertUser,
  type DeviceAttempt,
  type InsertDeviceAttempt,
} from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByDeviceId(deviceId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;

  // Device attempt operations
  getDeviceAttempt(deviceId: string): Promise<DeviceAttempt | undefined>;
  incrementDeviceAttempt(deviceId: string): Promise<DeviceAttempt>;
  blockDevice(deviceId: string, reason: string): Promise<DeviceAttempt>;
  unblockDevice(deviceId: string): Promise<DeviceAttempt | undefined>;
  submitUnblockRequest(
    deviceId: string,
    message: string,
  ): Promise<DeviceAttempt | undefined>;
  getBlockedDevices(): Promise<DeviceAttempt[]>;
  rejectUnblockRequest(
    deviceId: string,
    reason: string,
  ): Promise<DeviceAttempt | undefined>;

  // Employee ID operations
  generateEmployeeId(userId: number): Promise<User | undefined>;
  getUserByEmpId(empId: string): Promise<User | undefined>;
  updateEmployeeId(userId: number, empId: string): Promise<User | undefined>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByDeviceId(deviceId: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.deviceId, deviceId));
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Generate Employee ID automatically
    const nextEmpId = await this.generateNextEmpId();

    const result = await db
      .insert(users)
      .values({
        ...insertUser,
        empId: nextEmpId,
      })
      .returning();
    return result[0];
  }

  private async generateNextEmpId(): Promise<string> {
    // Get the highest employee ID number currently in use
    const result = await db
      .select({ empId: users.empId })
      .from(users)
      .where(sql`${users.empId} IS NOT NULL`)
      .orderBy(sql`CAST(SUBSTRING(${users.empId} FROM 5) AS INTEGER) DESC`)
      .limit(1);

    let nextNumber = 1;
    if (result.length > 0 && result[0].empId) {
      // Extract the number from "Emp-X" format
      const currentNumber = parseInt(result[0].empId.substring(4));
      nextNumber = currentNumber + 1;
    }

    return `Emp-${nextNumber}`;
  }

  async updateUser(
    id: number,
    userData: Partial<User>,
  ): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }

  // Device attempt methods
  async getDeviceAttempt(deviceId: string): Promise<DeviceAttempt | undefined> {
    const result = await db
      .select()
      .from(deviceAttempts)
      .where(eq(deviceAttempts.deviceId, deviceId));
    return result[0];
  }

  async incrementDeviceAttempt(deviceId: string): Promise<DeviceAttempt> {
    // First check if a record exists
    const existing = await this.getDeviceAttempt(deviceId);

    if (existing) {
      // Increment the existing record
      const newAttempts = (existing.attempts || 0) + 1;
      const isBlocked = newAttempts >= 3; // Block after 3 attempts

      const updates: Partial<DeviceAttempt> = {
        attempts: newAttempts,
        lastAttempt: new Date(),
      };

      // If we need to block the device now
      if (isBlocked && !existing.isBlocked) {
        updates.isBlocked = true;
        updates.blockedAt = new Date();
        updates.blockReason = "Too many registration attempts";
      }

      const [updated] = await db
        .update(deviceAttempts)
        .set(updates)
        .where(eq(deviceAttempts.deviceId, deviceId))
        .returning();

      return updated;
    } else {
      // Create a new record
      const [newRecord] = await db
        .insert(deviceAttempts)
        .values({
          deviceId,
          attempts: 1,
          lastAttempt: new Date(),
        })
        .returning();

      return newRecord;
    }
  }

  async blockDevice(deviceId: string, reason: string): Promise<DeviceAttempt> {
    const existing = await this.getDeviceAttempt(deviceId);

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(deviceAttempts)
        .set({
          isBlocked: true,
          blockedAt: new Date(),
          blockReason: reason,
        })
        .where(eq(deviceAttempts.deviceId, deviceId))
        .returning();

      return updated;
    } else {
      // Create a new record that's already blocked
      const [newRecord] = await db
        .insert(deviceAttempts)
        .values({
          deviceId,
          attempts: 3, // Start with 3 attempts to indicate block threshold
          lastAttempt: new Date(),
          isBlocked: true,
          blockedAt: new Date(),
          blockReason: reason,
        })
        .returning();

      return newRecord;
    }
  }

  async unblockDevice(deviceId: string): Promise<DeviceAttempt | undefined> {
    const existing = await this.getDeviceAttempt(deviceId);

    if (!existing) {
      return undefined;
    }

    const [updated] = await db
      .update(deviceAttempts)
      .set({
        isBlocked: false,
        attempts: 0, // Reset attempts
        blockedAt: null,
        blockReason: null,
        unblockRequestSent: false,
        unblockRequestMessage: null,
      })
      .where(eq(deviceAttempts.deviceId, deviceId))
      .returning();

    return updated;
  }

  async submitUnblockRequest(
    deviceId: string,
    message: string,
  ): Promise<DeviceAttempt | undefined> {
    const existing = await this.getDeviceAttempt(deviceId);

    if (!existing || !existing.isBlocked) {
      return undefined;
    }

    const [updated] = await db
      .update(deviceAttempts)
      .set({
        unblockRequestSent: true,
        unblockRequestMessage: message,
      })
      .where(eq(deviceAttempts.deviceId, deviceId))
      .returning();

    return updated;
  }

  async getBlockedDevices(): Promise<DeviceAttempt[]> {
    return await db
      .select()
      .from(deviceAttempts)
      .where(eq(deviceAttempts.isBlocked, true))
      .orderBy(deviceAttempts.blockedAt);
  }

  async rejectUnblockRequest(
    deviceId: string,
    reason: string,
  ): Promise<DeviceAttempt | undefined> {
    const existing = await this.getDeviceAttempt(deviceId);

    if (!existing || !existing.isBlocked || !existing.unblockRequestSent) {
      return undefined;
    }

    // Update block reason with rejection reason but keep the device blocked
    const [updated] = await db
      .update(deviceAttempts)
      .set({
        unblockRequestSent: false,
        unblockRequestMessage: null,
        blockReason: `Request rejected: ${reason}`,
      })
      .where(eq(deviceAttempts.deviceId, deviceId))
      .returning();

    return updated;
  }

  async generateEmployeeId(userId: number): Promise<User | undefined> {
    // Get the user first to check if they already have an Employee ID
    const existingUser = await this.getUser(userId);
    
    if (!existingUser) {
      return undefined;
    }

    if (existingUser.empId) {
      return existingUser; // Already has Employee ID
    }

    // Generate the next Employee ID using the same logic as in createUser
    const empId = await this.generateNextEmpId();

    // Update the user with the new Employee ID
    const [updatedUser] = await db
      .update(users)
      .set({ empId })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async getUserByEmpId(empId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.empId, empId));
    return user || undefined;
  }

  async updateEmployeeId(userId: number, empId: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ empId })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }
}

export const storage = new DatabaseStorage();

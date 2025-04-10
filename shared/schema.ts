import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  deviceId: text("deviceId"),
  deviceName: text("deviceName"),
  deviceModel: text("deviceModel"),
  devicePlatform: text("devicePlatform"),
});

// Track device registration attempts and blocks
export const deviceAttempts = pgTable("deviceAttempts", {
  id: serial("id").primaryKey(),
  deviceId: text("deviceId").notNull().unique(),
  attempts: integer("attempts").default(0),
  lastAttempt: timestamp("lastAttempt").defaultNow(),
  isBlocked: boolean("isBlocked").default(false),
  blockedAt: timestamp("blockedAt"),
  blockReason: text("blockReason"),
  unblockRequestSent: boolean("unblockRequestSent").default(false),
  unblockRequestMessage: text("unblockRequestMessage"),
  
  // Login attempt tracking
  loginAttempts: integer("loginAttempts").default(0),
  lastLoginAttempt: timestamp("lastLoginAttempt"),
  loginBlockExpiresAt: timestamp("loginBlockExpiresAt"),
  loginBlockLevel: integer("loginBlockLevel").default(0), // 0: none, 1: 5min, 2: 15min, 3: 24h
});

// Create base schema and add custom validation
const baseInsertUserSchema = createInsertSchema(users);

export const insertUserSchema = baseInsertUserSchema
  .extend({
    email: z.string().email("Please enter a valid email").min(1, "Email is required")
  })
  .pick({
    username: true,
    email: true,
    password: true,
    deviceId: true,
    deviceName: true,
    deviceModel: true,
    devicePlatform: true,
  });

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  deviceId: z.string().optional(),
  deviceInfo: z.object({
    deviceName: z.string().optional(),
    deviceModel: z.string().optional(),
    devicePlatform: z.string().optional(),
  }).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type DeviceAttempt = typeof deviceAttempts.$inferSelect;
export type InsertDeviceAttempt = typeof deviceAttempts.$inferInsert;

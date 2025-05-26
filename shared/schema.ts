import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  empId: text("empid").unique(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user"), // 'user' or 'admin'
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
    email: z.string().email("Please enter a valid email").min(1, "Email is required"),
    role: z.enum(["user", "admin"]).default("user")
  })
  .pick({
    username: true,
    email: true,
    password: true,
    role: true,
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

// User location history for tracking login/logout events with geolocation
export const userLocationHistory = pgTable("userLocationHistory", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  username: text("username"),
  email: text("email"),
  timestamp: timestamp("timestamp").defaultNow(),
  eventType: text("eventType").notNull(), // 'login' or 'logout'
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  ipAddress: text("ipAddress"),
  addressInfo: jsonb("addressInfo"), // JSON with address details
  deviceInfo: text("deviceInfo"), // JSON string with device details
});

// Create schema for location data
export const locationDataSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  ipAddress: z.string().optional(),
});

// Attendance management tables
export const workLocations = pgTable("workLocations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  radius: doublePrecision("radius").default(100), // Geofence radius in meters
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const userWorkLocations = pgTable("userWorkLocations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  locationId: integer("locationId").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  workLocationId: integer("workLocationId").notNull(),
  clockInTime: timestamp("clockInTime").notNull(),
  clockOutTime: timestamp("clockOutTime"),
  totalHours: doublePrecision("totalHours"),
  status: text("status").default("present"), // 'present', 'absent', 'late', 'half-day'
  notes: text("notes"),
  clockInLocationId: integer("clockInLocationId"), // Reference to userLocationHistory
  clockOutLocationId: integer("clockOutLocationId"), // Reference to userLocationHistory
  isWithinGeofence: boolean("isWithinGeofence").default(true),
  date: timestamp("date").notNull(), // The date of this attendance record
});

// Schemas for new tables
export const workLocationSchema = createInsertSchema(workLocations)
  .extend({
    name: z.string().min(1, "Location name is required"),
    address: z.string().min(1, "Address is required"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().min(10).max(5000),
  });

export const attendanceSchema = createInsertSchema(attendance)
  .extend({
    status: z.enum(["present", "absent", "late", "half-day"]).default("present"),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type DeviceAttempt = typeof deviceAttempts.$inferSelect;
export type InsertDeviceAttempt = typeof deviceAttempts.$inferInsert;
export type UserLocationHistory = typeof userLocationHistory.$inferSelect;
export type InsertUserLocationHistory = typeof userLocationHistory.$inferInsert;
export type LocationData = z.infer<typeof locationDataSchema>;
export type WorkLocation = typeof workLocations.$inferSelect;
export type InsertWorkLocation = z.infer<typeof workLocationSchema>;
// Leave Management System tables
export const leaveTypes = pgTable("leaveTypes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  allowedDays: integer("allowedDays").notNull(),
  requiresApproval: boolean("requiresApproval").default(true),
  color: text("color").default("#3B82F6"), // Default blue color for UI representation
  createdAt: timestamp("createdAt").defaultNow(),
});

export const leaveBalances = pgTable("leaveBalances", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  leaveTypeId: integer("leaveTypeId").notNull(),
  year: integer("year").notNull(), // Leave balance for specific year
  totalDays: integer("totalDays").notNull(),
  usedDays: integer("usedDays").default(0),
  pendingDays: integer("pendingDays").default(0), // Days in pending requests
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const leaveRequests = pgTable("leaveRequests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  leaveTypeId: integer("leaveTypeId").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalDays: doublePrecision("totalDays").notNull(),
  reason: text("reason"),
  status: text("status").default("pending"), // 'pending', 'approved', 'rejected', 'cancelled'
  approvedById: integer("approvedById"), // Admin/manager who approved the request
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  attachmentUrl: text("attachmentUrl"), // For medical certificates, etc.
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Schemas for leave management tables
export const leaveTypeSchema = createInsertSchema(leaveTypes)
  .extend({
    name: z.string().min(1, "Leave type name is required"),
    allowedDays: z.number().min(0, "Allowed days cannot be negative"),
  });

export const leaveBalanceSchema = createInsertSchema(leaveBalances)
  .extend({
    year: z.number().min(2000).max(2100),
    totalDays: z.number().min(0, "Total days cannot be negative"),
  });

export const leaveRequestSchema = createInsertSchema(leaveRequests)
  .extend({
    startDate: z.date().or(z.string().datetime()),
    endDate: z.date().or(z.string().datetime()),
    status: z.enum(["pending", "approved", "rejected", "cancelled"]).default("pending"),
    totalDays: z.number().min(0.5, "Leave must be at least half a day"),
  });

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof attendanceSchema>;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertLeaveType = z.infer<typeof leaveTypeSchema>;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveBalance = z.infer<typeof leaveBalanceSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof leaveRequestSchema>;

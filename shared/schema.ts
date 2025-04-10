import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
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

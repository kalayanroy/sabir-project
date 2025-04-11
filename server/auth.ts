import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, User, deviceAttempts, LocationData } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { recordUserLocation, getUserLocationHistory, getAllUsersLocationHistory } from "./locationService";
import { deviceAttemptActions } from "./deviceAttemptActions";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Use a secure random string in production
  const sessionSecret = process.env.SESSION_SECRET || "secure-session-secret";
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { 
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true 
      },
      async (req, username, password, done) => {
        try {
          // Try to find user by username
          let user = await storage.getUserByUsername(username);
          
          // If not found by username, try by email
          if (!user) {
            user = await storage.getUserByEmail(username);
          }
          
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid username or password" });
          }
          
          // Device verification if deviceId exists for the user
          if (user.deviceId) {
            const deviceId = req.body.deviceId;
            
            // If the user has a registered device, verify it matches
            if (user.deviceId !== deviceId) {
              return done(null, false, { 
                message: "Authentication failed: This account is registered to another device." 
              });
            }
          }
          
          // If there's a deviceId in request but not in user, update the user
          if (req.body.deviceId && !user.deviceId) {
            // Update user with device info
            user.deviceId = req.body.deviceId;
            if (req.body.deviceInfo) {
              user.deviceName = req.body.deviceInfo.deviceName || user.deviceName;
              user.deviceModel = req.body.deviceInfo.deviceModel || user.deviceModel;
              user.devicePlatform = req.body.deviceInfo.devicePlatform || user.devicePlatform;
            }
            // In a real implementation, we would update the user in the database here
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration request body:", req.body);
      
      // Validate required fields
      if (!req.body.username || !req.body.email || !req.body.password) {
        console.log("Missing required fields:", { 
          username: !!req.body.username, 
          email: !!req.body.email, 
          password: !!req.body.password 
        });
        return res.status(400).send("Missing required fields");
      }
      
      // Check if deviceId is provided
      if (!req.body.deviceId) {
        return res.status(400).send("Device ID is required for registration");
      }
      
      // Check if device is blocked
      const deviceAttempt = await storage.getDeviceAttempt(req.body.deviceId);
      if (deviceAttempt && deviceAttempt.isBlocked) {
        return res.status(403).send(
          "This device has been blocked due to too many registration attempts. " +
          "Please submit an unblock request to the administrator."
        );
      }
      
      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        // Increment failed attempt
        await storage.incrementDeviceAttempt(req.body.deviceId);
        return res.status(400).send("Username already exists");
      }

      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        // Increment failed attempt
        await storage.incrementDeviceAttempt(req.body.deviceId);
        return res.status(400).send("Email already exists");
      }
      
      // Check if deviceId already exists (one account per device)
      const existingUserByDeviceId = await storage.getUserByDeviceId(req.body.deviceId);
      if (existingUserByDeviceId) {
        // Increment failed attempt
        await storage.incrementDeviceAttempt(req.body.deviceId);
        return res.status(400).send("An account is already registered from this device. Each device can only have one account.");
      }

      // Hash password
      const hashedPassword = await hashPassword(req.body.password);
      
      // Create user with hashed password
      const userData = {
        ...req.body,
        password: hashedPassword,
      };
      
      console.log("Creating user with data:", {
        ...userData,
        password: "[REDACTED]"
      });
      
      // If we get here, the registration is successful
      // Reset any tracking of failed attempts for this device
      if (deviceAttempt) {
        await storage.unblockDevice(req.body.deviceId);
      }
      
      const user = await storage.createUser(userData);

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user data without password
        const { password, ...userData } = user;
        res.status(201).json(userData);
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    // Check for deviceId in the request
    const deviceId = req.body.deviceId;
    if (!deviceId) {
      return res.status(400).send("Device ID is required for login");
    }
    
    // Extract location data from request if available
    const locationData = req.body.locationData || {};
    
    // Get IP address from request
    const ipAddress = req.headers['x-forwarded-for'] || 
                      req.socket.remoteAddress || 
                      'unknown';
                      
    if (typeof ipAddress === 'string') {
      locationData.ipAddress = ipAddress;
    }
    
    // Check if device is blocked for login attempts
    try {
      let deviceAttempt = await storage.getDeviceAttempt(deviceId);
      
      // If no device record exists yet, create one
      if (!deviceAttempt) {
        deviceAttempt = await storage.incrementDeviceAttempt(deviceId);
        deviceAttempt.loginAttempts = 0;
      }
      
      // Check if device is permanently blocked
      if (deviceAttempt.isBlocked) {
        return res.status(403).send(
          "This device has been blocked. Please submit an unblock request to the administrator."
        );
      }
      
      // Check if there's a temporary login block in effect
      if (deviceAttempt.loginBlockExpiresAt) {
        const now = new Date();
        const blockExpiry = new Date(deviceAttempt.loginBlockExpiresAt);
        
        if (now < blockExpiry) {
          // Still blocked
          const remainingMinutes = Math.ceil((blockExpiry.getTime() - now.getTime()) / (60 * 1000));
          
          return res.status(403).send(
            `Too many failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
          );
        }
      }
      
      // Proceed with authentication
      passport.authenticate("local", async (err: any, user: User | false, info: any) => {
        if (err) {
          return next(err);
        }
        
        if (!user) {
          // Failed login attempt - update counter and possibly block
          try {
            // Increment login attempts
            const currentAttempts = deviceAttempt.loginAttempts || 0;
            const updatedAttempt = await db
              .update(deviceAttempts)
              .set({
                loginAttempts: currentAttempts + 1,
                lastLoginAttempt: new Date(),
              })
              .where(eq(deviceAttempts.deviceId, deviceId))
              .returning();
            
            const newAttemptCount = updatedAttempt[0].loginAttempts || 0;
            let blockMessage = "Invalid credentials";
            
            // Apply progressive timeouts based on number of attempts
            if (newAttemptCount >= 6) {
              // Block for 24 hours (level 3)
              const expiryTime = new Date();
              expiryTime.setHours(expiryTime.getHours() + 24);
              
              await db
                .update(deviceAttempts)
                .set({
                  loginBlockLevel: 3,
                  loginBlockExpiresAt: expiryTime,
                })
                .where(eq(deviceAttempts.deviceId, deviceId));
              
              blockMessage = "Too many failed login attempts. Your account is locked for 24 hours.";
            } 
            else if (newAttemptCount >= 5) {
              // Block for 15 minutes (level 2)
              const expiryTime = new Date();
              expiryTime.setMinutes(expiryTime.getMinutes() + 15);
              
              await db
                .update(deviceAttempts)
                .set({
                  loginBlockLevel: 2,
                  loginBlockExpiresAt: expiryTime,
                })
                .where(eq(deviceAttempts.deviceId, deviceId));
              
              blockMessage = "Too many failed login attempts. Please try again in 15 minutes.";
            }
            else if (newAttemptCount >= 3) {
              // Block for 5 minutes (level 1)
              const expiryTime = new Date();
              expiryTime.setMinutes(expiryTime.getMinutes() + 5);
              
              await db
                .update(deviceAttempts)
                .set({
                  loginBlockLevel: 1,
                  loginBlockExpiresAt: expiryTime,
                })
                .where(eq(deviceAttempts.deviceId, deviceId));
              
              blockMessage = "Too many failed login attempts. Please try again in 5 minutes.";
            }
            
            return res.status(403).send(blockMessage);
          } catch (error) {
            console.error("Error updating login attempts:", error);
            return res.status(401).send(info?.message || "Invalid credentials");
          }
        }
        
        // Successful login - reset login attempts
        try {
          await db
            .update(deviceAttempts)
            .set({
              loginAttempts: 0,
              loginBlockLevel: 0,
              loginBlockExpiresAt: null,
            })
            .where(eq(deviceAttempts.deviceId, deviceId));
        } catch (error) {
          console.error("Error resetting login attempts:", error);
        }
        
        // If deviceId is in request but not in user, update the user record
        if (req.body.deviceId && user && !user.deviceId) {
          storage.updateUser(user.id, {
            deviceId: req.body.deviceId,
            deviceName: req.body.deviceInfo?.deviceName,
            deviceModel: req.body.deviceInfo?.deviceModel,
            devicePlatform: req.body.deviceInfo?.devicePlatform,
          }).catch(error => console.error("Failed to update user device info:", error));
        }
        
        req.login(user, async (err: any) => {
          if (err) {
            return next(err);
          }
          
          // Record login location
          try {
            // Cast locationData to proper type and record login event
            await recordUserLocation(
              user.id, 
              'login', 
              locationData as LocationData
            );
            console.log(`Recorded login location for user ${user.id}`);
          } catch (error) {
            console.error("Failed to record login location:", error);
            // Don't block the login if location recording fails
          }
          
          // Return user data without password
          const { password, ...userData } = user;
          return res.status(200).json(userData);
        });
      })(req, res, next);
    } catch (error) {
      console.error("Error checking device login status:", error);
      return next(error);
    }
  });

  app.post("/api/logout", async (req, res, next) => {
    // Extract location data from request if available
    const locationData = req.body.locationData || {};
    
    // Get IP address from request
    const ipAddress = req.headers['x-forwarded-for'] || 
                      req.socket.remoteAddress || 
                      'unknown';
                      
    if (typeof ipAddress === 'string') {
      locationData.ipAddress = ipAddress;
    }
    
    // If user is authenticated, record the logout location
    if (req.isAuthenticated() && req.user) {
      try {
        await recordUserLocation(
          req.user.id, 
          'logout', 
          locationData as LocationData
        );
        console.log(`Recorded logout location for user ${req.user.id}`);
      } catch (error) {
        console.error("Failed to record logout location:", error);
        // Don't block logout if location recording fails
      }
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Return user data without password
    const { password, ...userData } = req.user;
    res.json(userData);
  });
  
  // Endpoint to check if a device is blocked
  app.get("/api/device-status", async (req, res) => {
    const deviceId = req.query.deviceId as string;
    
    if (!deviceId) {
      return res.status(400).send("Device ID is required");
    }
    
    const deviceAttempt = await storage.getDeviceAttempt(deviceId);
    if (!deviceAttempt) {
      return res.json({ 
        isBlocked: false,
        attempts: 0,
        message: "No registration attempts yet"
      });
    }
    
    return res.json({
      isBlocked: deviceAttempt.isBlocked,
      attempts: deviceAttempt.attempts,
      message: deviceAttempt.isBlocked 
        ? "This device is blocked due to too many registration attempts" 
        : "This device is not blocked",
      unblockRequestSent: deviceAttempt.unblockRequestSent
    });
  });

  // Endpoint to submit an unblock request
  app.post("/api/submit-unblock-request", async (req, res) => {
    const { deviceId, message } = req.body;
    
    if (!deviceId) {
      return res.status(400).send("Device ID is required");
    }
    
    if (!message) {
      return res.status(400).send("Message is required");
    }
    
    const deviceAttempt = await storage.getDeviceAttempt(deviceId);
    
    if (!deviceAttempt) {
      return res.status(404).send("Device not found");
    }
    
    if (!deviceAttempt.isBlocked) {
      return res.status(400).send("This device is not blocked");
    }
    
    if (deviceAttempt.unblockRequestSent) {
      return res.status(400).send("An unblock request has already been submitted");
    }
    
    const updated = await storage.submitUnblockRequest(deviceId, message);
    
    return res.json({
      success: true,
      message: "Unblock request submitted successfully",
      deviceAttempt: updated
    });
  });
  
  // Admin endpoints
  
  // Get all blocked devices
  app.get("/api/admin/blocked-devices", async (req, res) => {
    if (!req.isAuthenticated() || req.user.username !== "admin1") {
      return res.status(403).send("Unauthorized");
    }
    
    const blockedDevices = await db
      .select()
      .from(deviceAttempts)
      .where(eq(deviceAttempts.isBlocked, true));
    
    return res.json(blockedDevices);
  });
  
  // Get all user location history (admin only)
  app.get("/api/admin/user-locations", async (req, res) => {
    if (!req.isAuthenticated() || req.user.username !== "admin1") {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      const locationHistory = await getAllUsersLocationHistory();
      return res.json(locationHistory);
    } catch (error) {
      console.error("Error fetching user location history:", error);
      return res.status(500).send("Failed to fetch location history");
    }
  });
  
  // Get location history for a specific user (admin only)
  app.get("/api/admin/user-locations/:userId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.username !== "admin1") {
      return res.status(403).send("Unauthorized");
    }
    
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).send("Invalid user ID");
    }
    
    try {
      const locationHistory = await getUserLocationHistory(userId);
      return res.json(locationHistory);
    } catch (error) {
      console.error(`Error fetching location history for user ${userId}:`, error);
      return res.status(500).send("Failed to fetch location history");
    }
  });
  
  // Get all unblock requests
  app.get("/api/admin/unblock-requests", async (req, res) => {
    if (!req.isAuthenticated() || req.user.username !== "admin1") {
      return res.status(403).send("Unauthorized");
    }
    
    try {
      // Use imported deviceAttemptActions
      const requests = await deviceAttemptActions.getUnblockRequests();
      return res.json(requests);
    } catch (error) {
      console.error("Error fetching unblock requests:", error);
      return res.status(500).send("Failed to fetch unblock requests");
    }
  });
  
  // Unblock a device (approve request)
  app.post("/api/admin/unblock-device", async (req, res) => {
    if (!req.isAuthenticated() || req.user.username !== "admin1") {
      return res.status(403).send("Unauthorized");
    }
    
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).send("Device ID is required");
    }
    
    const updated = await storage.unblockDevice(deviceId);
    
    if (!updated) {
      return res.status(404).send("Device not found");
    }
    
    return res.json({
      success: true,
      message: "Device unblocked successfully",
      deviceAttempt: updated,
      status: "approved"
    });
  });
  
  // Reject an unblock request
  app.post("/api/admin/reject-unblock-request", async (req, res) => {
    if (!req.isAuthenticated() || req.user.username !== "admin1") {
      return res.status(403).send("Unauthorized");
    }
    
    const { deviceId, reason } = req.body;
    
    if (!deviceId) {
      return res.status(400).send("Device ID is required");
    }
    
    if (!reason) {
      return res.status(400).send("Rejection reason is required");
    }
    
    try {
      // Use imported deviceAttemptActions
      const updated = await deviceAttemptActions.rejectUnblockRequest(deviceId, reason);
      
      if (!updated) {
        return res.status(404).send("Device not found");
      }
      
      return res.json({
        success: true,
        message: "Unblock request rejected",
        deviceAttempt: updated,
        status: "rejected"
      });
    } catch (error) {
      console.error("Error rejecting unblock request:", error);
      return res.status(500).send(error instanceof Error ? error.message : "Failed to reject unblock request");
    }
  });
}

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, User } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
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
      
      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).send("Username already exists");
      }

      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        return res.status(400).send("Email already exists");
      }
      
      // Check if deviceId already exists (one account per device)
      if (req.body.deviceId) {
        const existingUserByDeviceId = await storage.getUserByDeviceId(req.body.deviceId);
        if (existingUserByDeviceId) {
          return res.status(400).send("An account is already registered from this device. Each device can only have one account.");
        }
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

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).send(info?.message || "Invalid credentials");
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
      
      req.login(user, (err: any) => {
        if (err) {
          return next(err);
        }
        
        // Return user data without password
        const { password, ...userData } = user;
        return res.status(200).json(userData);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
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
}

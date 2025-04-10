import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Login block information type
type LoginBlockInfo = {
  isBlocked: boolean;
  message: string;
  expiresAt?: Date;
  remainingMinutes?: number;
};

type LoginData = {
  username: string;
  password: string;
  deviceId?: string;
  deviceInfo?: {
    deviceName?: string;
    deviceModel?: string;
    devicePlatform?: string;
  };
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  deviceModel?: string;
  devicePlatform?: string;
};

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
  loginBlockInfo: LoginBlockInfo | null;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // State for login block information
  const [loginBlockInfo, setLoginBlockInfo] = useState<LoginBlockInfo | null>(null);
  
  // Timer to update remaining time
  useEffect(() => {
    if (!loginBlockInfo?.expiresAt) return;
    
    // Update remaining time every minute
    const intervalId = setInterval(() => {
      const now = new Date();
      const expiresAt = new Date(loginBlockInfo.expiresAt!);
      
      if (now >= expiresAt) {
        // Block has expired
        setLoginBlockInfo(null);
        clearInterval(intervalId);
      } else {
        // Update remaining time
        const remainingMinutes = Math.ceil((expiresAt.getTime() - now.getTime()) / (60 * 1000));
        setLoginBlockInfo(prev => prev ? {
          ...prev,
          remainingMinutes
        } : null);
      }
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [loginBlockInfo?.expiresAt]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        return await res.json();
      } catch (err: any) {
        console.log("Login error:", err);
        
        // Check if this is a login block error (403)
        if (err.status === 403) {
          const message = err.originalMessage || err.message || '';
          console.log("Login block detected:", message);
          
          // Parse remaining time from error message if possible
          const timeMatch = message.match(/try again in (\d+) minute/);
          if (timeMatch) {
            const remainingMinutes = parseInt(timeMatch[1], 10);
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + remainingMinutes);
            
            console.log("Setting login block with timer:", remainingMinutes, "minutes");
            
            setLoginBlockInfo({
              isBlocked: true,
              message,
              expiresAt,
              remainingMinutes
            });
          } else {
            // Generic block without specific time
            console.log("Setting generic login block");
            
            setLoginBlockInfo({
              isBlocked: true,
              message: message || 'Account temporarily locked'
            });
          }
        } else if (err.status === 401) {
          // Regular authentication failure
          console.log("Regular auth failure");
          
          // Make sure we clear any existing block info
          setLoginBlockInfo(null);
        }
        
        throw err;
      }
    },
    onSuccess: (user: SelectUser) => {
      // Reset login block info on successful login
      setLoginBlockInfo(null);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      // Only show toast if not a login block (that's handled separately)
      if (!loginBlockInfo) {
        toast({
          title: "Login failed",
          description: error.message || "Invalid username or password",
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      console.log("Register mutation sending data:", credentials);
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out successfully",
        description: "You've been securely logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        loginBlockInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

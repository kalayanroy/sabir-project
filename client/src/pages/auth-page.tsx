import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Lock, User, Mail, AlertCircle, Smartphone, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDeviceInfo } from "@/lib/device-utils";
import { UnblockRequestForm } from "@/components/unblock-request-form";

// Extended schema for login
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

// Extended schema for registration with validation
const registerSchema = insertUserSchema.extend({
  // Keep email validation from insertUserSchema
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation, loginBlockInfo } = useAuth();
  const [deviceInfo, setDeviceInfo] = useState(() => getDeviceInfo());
  const { deviceStatus, isLoading: isDeviceStatusLoading } = useDeviceStatus();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      deviceModel: deviceInfo.deviceModel,
      devicePlatform: deviceInfo.devicePlatform,
    },
  });

  // Handle login form submission
  const onLoginSubmit = (values: LoginValues) => {
    loginMutation.mutate({
      username: values.username,
      password: values.password,
      deviceId: deviceInfo.deviceId,
      deviceInfo: {
        deviceName: deviceInfo.deviceName,
        deviceModel: deviceInfo.deviceModel,
        devicePlatform: deviceInfo.devicePlatform
      }
    });
  };

  // Handle register form submission
  const onRegisterSubmit = (values: RegisterValues) => {
    console.log("Register form values:", values);
    
    // Force get current values from form
    const currentUsername = registerForm.getValues('username');
    const currentEmail = registerForm.getValues('email');
    
    // Create user data with current values
    const { confirmPassword, acceptTerms, ...userData } = values;
    
    // Add device information and ensure username and email are set
    const userDataWithDevice = {
      ...userData,
      username: currentUsername, // Ensure username is set from current value
      email: currentEmail, // Ensure email is set from current value
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      deviceModel: deviceInfo.deviceModel,
      devicePlatform: deviceInfo.devicePlatform,
    };
    
    console.log("Data being sent to server:", userDataWithDevice);
    
    // Additional validation
    if (!userDataWithDevice.username) {
      console.error("Username is empty!");
      registerForm.setError('username', { 
        type: 'manual', 
        message: 'Username is required' 
      });
      return;
    }
    
    if (!userDataWithDevice.email) {
      console.error("Email is empty!");
      registerForm.setError('email', { 
        type: 'manual', 
        message: 'Email is required' 
      });
      return;
    }
    
    console.log("Register mutation sending data:", userDataWithDevice);
    registerMutation.mutate(userDataWithDevice);
  };

  // Show loading spinner while checking device status
  if (isDeviceStatusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // If device is blocked, show unblock request form
  if (deviceStatus?.isBlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        {/* Form Side */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <UnblockRequestForm />
          </div>
        </div>
        
        {/* Hero Side */}
        <div className="w-full md:w-1/2 bg-primary/5 p-10 flex items-center justify-center">
          <div className="max-w-md">
            <div className="flex items-center space-x-2 mb-6">
              <ShieldAlert className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold">Device Blocked</h2>
            </div>
            <h1 className="text-3xl font-bold mb-4">
              Secure Device Registration
            </h1>
            <p className="text-lg mb-6">
              Your device has been blocked due to multiple registration attempts.
              For security reasons, each device is limited to one account and we 
              restrict the number of registration attempts.
            </p>
            
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 border border-accent">
              <h3 className="font-medium text-lg mb-2">Why was your device blocked?</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Multiple failed registration attempts</li>
                <li>Duplicate account creation attempts</li>
                <li>Suspicious activity detected</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Normal login/register flow
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Form Side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Login Form */}
          {isLogin ? (
            <Card className="w-full">
              <CardContent className="pt-6">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Lock className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-medium mb-1">Welcome Back</h1>
                  <p className="text-muted-foreground">Sign in to your account</p>
                </div>

                {/* Login Block Info with countdown timer */}
                {loginBlockInfo && loginBlockInfo.isBlocked && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex flex-col">
                        <span>{loginBlockInfo.message}</span>
                        {loginBlockInfo.remainingMinutes && (
                          <span className="mt-1 font-medium">
                            Time remaining: {loginBlockInfo.remainingMinutes} minute{loginBlockInfo.remainingMinutes !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Debug information */}
                <div className="mb-4 text-xs text-muted-foreground border border-border p-2 rounded">
                  <div><strong>Debug:</strong> Login block info: {JSON.stringify(loginBlockInfo)}</div>
                </div>
                
                {/* Regular login error (not a block) */}
                {loginMutation.error && !loginBlockInfo?.isBlocked && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {loginMutation.error.message || "Invalid username or password"}
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username or Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                              <Input 
                                placeholder="Enter your username or email" 
                                className="pl-10" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                className="pl-10" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Remember me
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <a href="#" className="text-sm text-primary font-medium">
                        Forgot password?
                      </a>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>

                    <div className="text-center mt-4">
                      <p className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setIsLogin(false)}
                          className="text-primary font-medium"
                        >
                          Register
                        </button>
                      </p>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            // Register Form
            <Card className="w-full">
              <CardContent className="pt-6">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-medium mb-1">Create Account</h1>
                  <p className="text-muted-foreground">Sign up to get started</p>
                </div>

                {registerMutation.error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {registerMutation.error.message}
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <div className="font-medium">
                        <label htmlFor="username-direct">Username</label>
                      </div>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <input 
                          id="username-direct"
                          type="text" 
                          name="username"
                          placeholder="Choose a username" 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
                          onChange={(e) => {
                            console.log("Direct username input changed:", e.target.value);
                            registerForm.setValue('username', e.target.value);
                          }}
                        />
                      </div>
                      {registerForm.formState.errors.username && (
                        <p className="text-sm font-medium text-destructive">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="font-medium">
                        <label htmlFor="email-direct">Email</label>
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <input 
                          id="email-direct"
                          type="text" 
                          name="email"
                          placeholder="Enter your email" 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
                          onChange={(e) => {
                            console.log("Direct email input changed:", e.target.value);
                            registerForm.setValue('email', e.target.value);
                          }}
                        />
                      </div>
                      {registerForm.formState.errors.email && (
                        <p className="text-sm font-medium text-destructive">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                              <Input 
                                type="password" 
                                placeholder="Create a password" 
                                className="pl-10" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                              <Input 
                                type="password" 
                                placeholder="Confirm your password" 
                                className="pl-10" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="acceptTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              I agree to the{" "}
                              <a href="#" className="text-primary">
                                Terms of Service
                              </a>{" "}
                              and{" "}
                              <a href="#" className="text-primary">
                                Privacy Policy
                              </a>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>

                    <div className="text-center mt-4">
                      <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setIsLogin(true)}
                          className="text-primary font-medium"
                        >
                          Sign in
                        </button>
                      </p>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Hero Side */}
      <div className="hidden md:flex md:w-1/2 bg-primary p-12 text-white flex-col justify-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-4">SecureLogin System</h1>
          <p className="text-lg mb-8">
            A secure authentication system with user registration, login, and profile management.
          </p>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mr-4">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-xl mb-1">Secure Authentication</h3>
                <p className="text-white/80">
                  Your data is protected with industry-standard encryption and secure
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mr-4">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-xl mb-1">Device-Bound Security</h3>
                <p className="text-white/80">
                  For your security, your account is linked to this device. You can only login from the device you registered on.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mr-4">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-xl mb-1">User Management</h3>
                <p className="text-white/80">
                  Easily update your profile information and manage your account settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

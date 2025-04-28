import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { Wind, Shield, Building2, HardHat } from "lucide-react";
import { PasswordChangeRequest } from "@shared/types";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Please enter a valid email"),
  fullName: z.string().min(1, "Full name is required"),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const { user, loginMutation, changePasswordMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.passwordRequiresChange) {
        setShowPasswordChange(true);
      } else {
        setLocation("/app");
      }
    }
  }, [user, setLocation]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form removed

  // Password change form
  const passwordChangeForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  // Removed register mutation handler

  const onPasswordChangeSubmit = (data: z.infer<typeof passwordChangeSchema>) => {
    const passwordData: PasswordChangeRequest = {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    };
    changePasswordMutation.mutate(passwordData, {
      onSuccess: () => {
        setLocation("/app");
      }
    });
  };

  if (showPasswordChange) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Height-tec</CardTitle>
            <CardDescription>Wind Monitoring Platform</CardDescription>
          </CardHeader>
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">Change Your Password</h2>
            <p className="text-neutral-500 mb-6 text-sm">
              For security reasons, you need to change your password on first login.
            </p>
            <Form {...passwordChangeForm}>
              <form onSubmit={passwordChangeForm.handleSubmit(onPasswordChangeSubmit)} className="space-y-4">
                <FormField
                  control={passwordChangeForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter current password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordChangeForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordChangeForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full py-3"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? "Updating Password..." : "Update Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center">
              <h1 className="text-3xl font-bold text-primary font-heading italic flex items-center justify-center gap-2">
                <img src="/logo2.png" alt="Height-tec logo" className="w-20 h-20" />
                Height-tec
              </h1>
              <p className="text-neutral-500 mt-2">Wind Monitoring Platform</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Sign In</h2>
            <p className="text-neutral-500">Enter your credentials to access your account</p>
          </div>
          
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
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
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full py-3"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
      
      {/* Right side - Hero content */}
      <div className="w-full md:w-1/2 bg-primary p-8 flex items-center justify-center text-white">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold mb-6 font-heading">Real-time Wind Monitoring for Construction Safety</h2>
          <p className="mb-6">
            Monitor wind speeds in real-time from your remote construction sites with cloud-connected anemometers.
            Make data-driven safety decisions and ensure regulatory compliance.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-white/10 p-2 rounded-full mr-4">
                <Wind className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Live Wind Data</h3>
                <p className="text-white/80 text-sm">
                  Get real-time wind speeds and alerts directly from your construction sites
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/10 p-2 rounded-full mr-4">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Safety Compliance</h3>
                <p className="text-white/80 text-sm">
                  Ensure workplace safety and regulatory compliance with accurate monitoring
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/10 p-2 rounded-full mr-4">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Multiple Sites</h3>
                <p className="text-white/80 text-sm">
                  Monitor and manage all your construction sites from a single dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/10 p-2 rounded-full mr-4">
                <HardHat className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Designed for Construction</h3>
                <p className="text-white/80 text-sm">
                  Built specifically for construction companies, crane operators, and safety managers
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

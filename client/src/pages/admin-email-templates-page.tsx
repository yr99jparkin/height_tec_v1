import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Redirect } from "wouter";
import { Header } from "@/components/layout/header";
import { AlertCircle, FileText, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

// Define the type for the email template response
interface EmailTemplateResponse {
  template: string;
}

export default function AdminEmailTemplatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // If the user is not an admin, redirect to home
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }
  
  // Fetch email template from the server
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery<EmailTemplateResponse>({
    queryKey: ['/api/admin/email-template'],
    refetchOnWindowFocus: false,
  });
  
  // Use optional chaining with a fallback empty string for the template
  const emailTemplate = data && 'template' in data ? data.template : "";
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing template",
      description: "Fetching the latest email template from the server",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-heading font-semibold text-neutral-800 flex items-center">
            <Mail className="mr-2 h-6 w-6" />
            Email Template Preview
          </h1>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Template
          </Button>
        </div>
        
        {isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading template</AlertTitle>
            <AlertDescription>
              There was an error fetching the email template. Please try refreshing.
            </AlertDescription>
          </Alert>
        )}
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Wind Notification Email</CardTitle>
            <CardDescription>
              Preview how the notification email will appear to recipients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <div className="p-4">
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  <FileText className="mr-2 h-4 w-4" /> Notification Email Template
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This template is sent when a device exceeds wind speed thresholds.
                </p>
                
                <div className="border rounded-md overflow-hidden relative">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                        <p className="text-sm text-muted-foreground">Loading template...</p>
                      </div>
                    </div>
                  )}
                  <iframe 
                    srcDoc={emailTemplate}
                    className="w-full h-[600px] border-0"
                    title="Email Template Preview"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
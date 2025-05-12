import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Redirect } from "wouter";
import { Header } from "@/components/layout/header";
import { FileText, Mail } from "lucide-react";

// Wind notification email template matching exactly what's in the email-service.ts
const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Wind Speed Notification</title>
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #FF4444; padding: 15px; color: white; text-align: center;">
      <h1 style="margin: 0;">RED ALERT: High Wind Speed</h1>
    </div>
    
    <div style="padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
      <p>A high wind speed alert has been triggered:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Device:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">Sample Tower (HT-ANEM-001)</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Location:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">Site 1 - North Tower</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Wind Speed:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">42.0 m/s</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Alert Level:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">RED</td>
        </tr>
        <tr>
          <td style="padding: 8px;"><strong>Time:</strong></td>
          <td style="padding: 8px;">May 12, 2025, 10:15:00 AM</td>
        </tr>
      </table>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="#" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; margin: 5px; display: inline-block; border-radius: 4px;">
          Acknowledge & Snooze for 3 hours
        </a>
        
        <a href="#" style="background-color: #9C27B0; color: white; padding: 10px 20px; text-decoration: none; margin: 5px; display: inline-block; border-radius: 4px;">
          Acknowledge & Snooze for the rest of the day
        </a>
      </div>
      
      <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px;">
        <p style="font-size: 14px;">
          <a href="#" style="color: #E53935; text-decoration: underline;">Click here to unsubscribe or manage your notification settings</a> for this device.
        </p>
        <p style="font-size: 12px; color: #777; margin-top: 10px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export default function AdminEmailTemplatesPage() {
  const { user } = useAuth();

  // If the user is not an admin, redirect to home
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-heading font-semibold text-neutral-800 mb-6 flex items-center">
          <Mail className="mr-2 h-6 w-6" />
          Email Template Preview
        </h1>
        
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
                
                <div className="border rounded-md overflow-hidden">
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
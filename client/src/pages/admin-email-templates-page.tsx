import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Redirect } from "wouter";
import { Header } from "@/components/layout/header";
import { FileText, Mail } from "lucide-react";

// Sample notification email template
const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wind Alert Notification</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-bottom: 3px solid #e83e8c;
    }
    .content {
      padding: 20px;
      background-color: #ffffff;
    }
    .footer {
      font-size: 12px;
      color: #6c757d;
      text-align: center;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .alert {
      padding: 15px;
      margin-bottom: 20px;
      border: 1px solid transparent;
      border-radius: 4px;
    }
    .alert-danger {
      color: #721c24;
      background-color: #f8d7da;
      border-color: #f5c6cb;
    }
    .alert-warning {
      color: #856404;
      background-color: #fff3cd;
      border-color: #ffeeba;
    }
    .btn {
      display: inline-block;
      font-weight: 400;
      text-align: center;
      white-space: nowrap;
      vertical-align: middle;
      user-select: none;
      border: 1px solid transparent;
      padding: 0.375rem 0.75rem;
      font-size: 1rem;
      line-height: 1.5;
      border-radius: 0.25rem;
      text-decoration: none;
      margin: 5px;
    }
    .btn-primary {
      color: #fff;
      background-color: #007bff;
      border-color: #007bff;
    }
    .btn-warning {
      color: #212529;
      background-color: #ffc107;
      border-color: #ffc107;
    }
    .stats {
      margin: 20px 0;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      overflow: hidden;
    }
    .stats-header {
      background-color: #e9ecef;
      padding: 10px;
      font-weight: bold;
    }
    .stats-body {
      padding: 15px;
    }
    .stats-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #dee2e6;
      padding: 8px 0;
    }
    .stats-row:last-child {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❗ Wind Alert Notification ❗</h1>
    </div>
    <div class="content">
      <div class="alert alert-danger">
        <strong>RED ALERT:</strong> Dangerous wind conditions detected at <strong>Sample Tower (HT-ANEM-001)</strong>.
      </div>
      
      <p>Dear <strong>John Doe</strong>,</p>
      
      <p>This is an automated alert to inform you that the wind speed at <strong>Sample Tower (HT-ANEM-001)</strong> has exceeded the red alert threshold.</p>
      
      <div class="stats">
        <div class="stats-header">Current Wind Conditions</div>
        <div class="stats-body">
          <div class="stats-row">
            <span>Current Wind Speed:</span>
            <strong>42 km/h</strong>
          </div>
          <div class="stats-row">
            <span>Alert Threshold:</span>
            <strong>30 km/h (Red)</strong>
          </div>
          <div class="stats-row">
            <span>Reading Time:</span>
            <strong>May 12, 2025 10:15 AM</strong>
          </div>
          <div class="stats-row">
            <span>Location:</span>
            <strong>Site 1 - North Tower</strong>
          </div>
        </div>
      </div>
      
      <p>Please take appropriate safety measures according to your site protocols. This alert requires acknowledgment.</p>
      
      <p style="text-align: center;">
        <a href="#" class="btn btn-primary">Acknowledge Alert</a>
        <a href="#" class="btn btn-warning">Snooze for 3 Hours</a>
      </p>
      
      <p>For detailed information, please log in to the platform dashboard.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Wind Monitoring System. Please do not reply to this email.</p>
      <p>If you would like to stop receiving these alerts, <a href="#">click here to unsubscribe</a>.</p>
      <p>&copy; 2025 Wind Monitoring Platform</p>
    </div>
  </div>
</body>
</html>
`;

// Sample acknowledgment email template
const acknowledgeTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alert Acknowledged</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-bottom: 3px solid #28a745;
    }
    .content {
      padding: 20px;
      background-color: #ffffff;
    }
    .footer {
      font-size: 12px;
      color: #6c757d;
      text-align: center;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .alert {
      padding: 15px;
      margin-bottom: 20px;
      border: 1px solid transparent;
      border-radius: 4px;
    }
    .alert-success {
      color: #155724;
      background-color: #d4edda;
      border-color: #c3e6cb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Alert Acknowledged</h1>
    </div>
    <div class="content">
      <div class="alert alert-success">
        <strong>Confirmation:</strong> Wind alert for <strong>Sample Tower (HT-ANEM-001)</strong> has been acknowledged.
      </div>
      
      <p>Dear <strong>Team</strong>,</p>
      
      <p>This is to confirm that <strong>John Doe</strong> has acknowledged the wind alert for <strong>Sample Tower (HT-ANEM-001)</strong>.</p>
      
      <p><strong>Acknowledgment Time:</strong> May 12, 2025 10:17 AM</p>
      
      <p><strong>Alert Details:</strong></p>
      <ul>
        <li>Device: Sample Tower (HT-ANEM-001)</li>
        <li>Wind Speed: 42 km/h</li>
        <li>Alert Level: RED</li>
        <li>Alert Time: May 12, 2025 10:15 AM</li>
      </ul>
      
      <p>The alert has been marked as handled in the system.</p>
      
      <p>For detailed information, please log in to the platform dashboard.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Wind Monitoring System. Please do not reply to this email.</p>
      <p>&copy; 2025 Wind Monitoring Platform</p>
    </div>
  </div>
</body>
</html>
`;

export default function AdminEmailTemplatesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("alert");

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
          Email Templates Preview
        </h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Email Template Preview</CardTitle>
            <CardDescription>
              Preview how the notification emails will appear to recipients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="alert">Alert Email</TabsTrigger>
                <TabsTrigger value="acknowledge">Acknowledgment Email</TabsTrigger>
              </TabsList>
              
              <TabsContent value="alert" className="border rounded-md">
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <FileText className="mr-2 h-4 w-4" /> Alert Notification Template
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
              </TabsContent>
              
              <TabsContent value="acknowledge" className="border rounded-md">
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <FileText className="mr-2 h-4 w-4" /> Acknowledgment Email Template
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This template is sent when someone acknowledges an alert notification.
                  </p>
                  
                  <div className="border rounded-md overflow-hidden">
                    <iframe 
                      srcDoc={acknowledgeTemplate}
                      className="w-full h-[600px] border-0"
                      title="Acknowledgment Template Preview"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
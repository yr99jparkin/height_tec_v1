import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

type AcknowledgePageParams = {
  tokenId: string;
};

const AcknowledgePage = () => {
  const { tokenId } = useParams<AcknowledgePageParams>();
  const [_, setLocation] = useLocation();
  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Extract action from query string if present
  const searchParams = new URLSearchParams(window.location.search);
  const action = searchParams.get('action') || "acknowledge";

  // Define interface for token details
  interface TokenDetails {
    deviceId: string;
    deviceName: string;
    location?: string;
    tokenId: string;
    action: string;
    alertLevel: 'amber' | 'red';
    windSpeed: number;
    notificationContact: number;
    notificationId: number;
  }

  // Fetch token details
  const { data: tokenDetails, isLoading, error } = useQuery<TokenDetails>({
    queryKey: ['/api/alerts/token', tokenId],
    enabled: !!tokenId,
  });

  // Acknowledge or snooze mutation
  const acknowledgeMutation = useMutation({
    mutationFn: () => apiRequest(
      'POST',
      `/api/alerts/acknowledge/${tokenId}`, 
      { action }
    ),
    onSuccess: () => {
      setHasConfirmed(true);
    }
  });

  const handleConfirmClick = () => {
    acknowledgeMutation.mutate();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Verifying...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-center">Please wait while we verify your acknowledgment token.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !tokenDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md mx-auto border-destructive">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Invalid Request</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-center mb-4">
              The acknowledgment link is invalid, expired, or has already been used.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show confirmation screen first
  if (!hasConfirmed) {
    let actionText = "acknowledge this alert";
    if (action === "snooze_1h") {
      actionText = "acknowledge and snooze alerts for 1 hour";
    } else if (action === "snooze_today") {
      actionText = "acknowledge and snooze alerts for the rest of today";
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Confirm Action</CardTitle>
            <CardDescription className="text-center">
              You're about to {actionText}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="font-medium">Device:</span>
                <span>{tokenDetails.deviceName}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Location:</span>
                <span>{tokenDetails.location || "Unknown"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Alert Level:</span>
                <span className={tokenDetails.alertLevel === "red" ? "text-destructive font-bold" : "text-amber-500 font-bold"}>
                  {tokenDetails.alertLevel.toUpperCase()}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link to="/">Cancel</Link>
            </Button>
            <Button 
              onClick={handleConfirmClick}
              disabled={acknowledgeMutation.isPending}
            >
              {acknowledgeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show success screen after confirmation
  let successMessage = "Alert has been acknowledged successfully.";
  if (action === "snooze_1h") {
    successMessage = "Alerts have been snoozed for 1 hour.";
  } else if (action === "snooze_today") {
    successMessage = "Alerts have been snoozed for the rest of today.";
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-primary">Action Confirmed</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
          <p className="text-center mb-4">
            {successMessage}
          </p>
          <div className="space-y-4 w-full mt-4">
            <div className="flex justify-between">
              <span className="font-medium">Device:</span>
              <span>{tokenDetails.deviceName}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-medium">Location:</span>
              <span>{tokenDetails.location || "Unknown"}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link to="/login">Go to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AcknowledgePage;
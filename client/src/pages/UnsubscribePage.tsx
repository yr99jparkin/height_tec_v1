
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface UnsubscribePageProps {
  params: {
    contactId: string;
    deviceId: string;
  };
}

export default function UnsubscribePage({ params }: UnsubscribePageProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hasProcessed, setHasProcessed] = useState(false);
  const [, setLocation] = useLocation();
  
  // Get the parameters from the URL
  const { contactId, deviceId } = params;
  
  useEffect(() => {
    // Skip if we've already tried to process this request
    if (hasProcessed) {
      return;
    }
    
    const handleUnsubscribe = async () => {
      try {
        console.log(`Processing unsubscribe for contact ${contactId} from device ${deviceId}`);
        setHasProcessed(true);
        
        // Make the unsubscribe request as a POST request with no body
        const response = await fetch(`/api/alerts/unsubscribe/${contactId}/${deviceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to unsubscribe. Please try again.");
        }
        
        // Set status to success and redirect after a short delay to show a message
        setStatus("success");
        setTimeout(() => {
          setLocation("/alert/unsubscribe-success");
        }, 1500);
        
      } catch (error) {
        console.error("Error unsubscribing:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred");
      }
    };
    
    handleUnsubscribe();
  }, [contactId, deviceId, setLocation, hasProcessed]);
  
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 text-red-700 p-6 rounded-md mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Unsubscribe Failed</h1>
            <p className="mb-4">{errorMessage}</p>
            <p className="text-sm">
              If you continue to experience issues, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <div className="bg-green-100 text-green-700 p-6 rounded-md mb-4">
            <CheckCircle className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Unsubscribed Successfully</h1>
            <p>You have been successfully unsubscribed from notifications for this device.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Processing Your Request</h1>
        <p className="text-neutral-500 mb-8">Please wait while we unsubscribe you from notifications...</p>
      </div>
    </div>
  );
}

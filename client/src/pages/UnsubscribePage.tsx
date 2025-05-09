import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface UnsubscribePageProps {
  params: {
    contactId: string;
    deviceId: string;
  };
}

export default function UnsubscribePage({ params }: UnsubscribePageProps) {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  // Get the parameters from the URL
  const { contactId, deviceId } = params;
  
  useEffect(() => {
    const handleUnsubscribe = async () => {
      try {
        // Process unsubscribe by directly removing the contact
        await apiRequest(`/api/alerts/unsubscribe/${contactId}/${deviceId}`, "POST");
        
        // Redirect to success page
        setLocation("/alert/unsubscribe-success");
      } catch (err) {
        console.error("Error unsubscribing:", err);
        setError("Failed to process your unsubscribe request. Please try again later.");
        setIsProcessing(false);
      }
    };
    
    handleUnsubscribe();
  }, [contactId, deviceId, setLocation]);
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
            <h1 className="text-2xl font-bold mb-2">Error</h1>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Processing Unsubscribe Request</h1>
        <p className="text-neutral-500 mb-8">Please wait while we process your request...</p>
      </div>
    </div>
  );
}
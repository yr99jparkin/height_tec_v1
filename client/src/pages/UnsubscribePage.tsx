
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

interface ContactInfo {
  id: number;
  email: string;
  phone: string;
}

export default function UnsubscribePage({ params }: UnsubscribePageProps) {
  const [status, setStatus] = useState<"loading" | "confirming" | "processing" | "success" | "error">("loading");
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [, setLocation] = useLocation();
  
  // Get the parameters from the URL
  const { contactId, deviceId } = params;
  
  // First, load the contact info to confirm unsubscribe
  useEffect(() => {
    const loadContactInfo = async () => {
      try {
        console.log(`Loading contact info for ${contactId} from device ${deviceId}`);
        
        // Get the contact info via the redirected GET request
        const response = await fetch(`/api/alerts/unsubscribe/${contactId}/${deviceId}?redirected=true`);
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load contact information.");
        }
        
        const data = await response.json();
        if (data.contact) {
          setContact(data.contact);
          setStatus("confirming");
        } else {
          throw new Error("Contact information not found.");
        }
      } catch (error) {
        console.error("Error loading contact info:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred");
      }
    };
    
    loadContactInfo();
  }, [contactId, deviceId]);
  
  // Function to handle the unsubscribe action when confirmed
  const handleUnsubscribe = async () => {
    try {
      setStatus("processing");
      console.log(`Processing unsubscribe for contact ${contactId} from device ${deviceId}`);
      
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
  
  if (status === "confirming" && contact) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <div className="bg-amber-50 p-6 rounded-md mb-4 border border-amber-200">
            <h1 className="text-2xl font-bold mb-4">Confirm Unsubscribe</h1>
            <p className="mb-6">
              Are you sure you want to unsubscribe <strong>{contact.email}</strong> from receiving alerts for this device?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleUnsubscribe}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
              >
                Yes, Unsubscribe
              </button>
              <button
                onClick={() => window.close()}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
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
        <h1 className="text-2xl font-bold mb-2">
          {status === "processing" ? "Processing Your Request" : "Loading Contact Information"}
        </h1>
        <p className="text-neutral-500 mb-8">
          {status === "processing" 
            ? "Please wait while we unsubscribe you from notifications..." 
            : "Please wait while we retrieve your information..."}
        </p>
      </div>
    </div>
  );
}

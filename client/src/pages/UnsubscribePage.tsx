
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface UnsubscribePageProps {
  params: {
    contactId: string;
    deviceId: string;
  };
}

export default function UnsubscribePage({ params }: UnsubscribePageProps) {
  const [, setLocation] = useLocation();
  
  // Just display a placeholder loading UI and redirect to success page
  // The actual unsubscribe action is now handled on the server directly
  useEffect(() => {
    // Set a short delay to simulate loading, then redirect to success page
    const timer = setTimeout(() => {
      setLocation("/alert/unsubscribe-success");
    }, 500);
    
    return () => clearTimeout(timer);
  }, [setLocation]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Processing Your Request</h1>
        <p className="text-neutral-500 mb-8">
          Please wait while we redirect you...
        </p>
      </div>
    </div>
  );
}

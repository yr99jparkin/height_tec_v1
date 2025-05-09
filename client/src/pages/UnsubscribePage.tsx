import { useEffect } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface UnsubscribePageProps {
  params: {
    contactId: string;
    deviceId: string;
  };
}

export default function UnsubscribePage({ params }: UnsubscribePageProps) {
  // Get the parameters from the URL
  const { contactId, deviceId } = params;
  
  // Create the redirect URL
  const redirectUrl = `/?deviceId=${deviceId}&tab=notifications&contactId=${contactId}`;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Redirecting...</h1>
        <p className="text-neutral-500 mb-8">Taking you to your notification settings.</p>
        <Redirect to={redirectUrl} />
      </div>
    </div>
  );
}
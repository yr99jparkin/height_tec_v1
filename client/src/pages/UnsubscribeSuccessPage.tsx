import { CheckCircle } from "lucide-react";

interface UnsubscribeSuccessPageProps {
  params: {
    contactId?: string;
    deviceId?: string;
  };
}

export default function UnsubscribeSuccessPage({ params }: UnsubscribeSuccessPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="text-center max-w-md">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Unsubscribed Successfully</h1>
        <p className="text-muted-foreground mb-6">
          You have been successfully unsubscribed from wind alert notifications for this device.
        </p>
        <p className="text-muted-foreground text-sm">
          If you wish to resubscribe in the future, please contact your administrator.
        </p>
      </div>
    </div>
  );
}
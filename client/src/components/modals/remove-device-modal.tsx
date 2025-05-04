import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";

interface RemoveDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  deviceName: string;
  onDeviceRemoved: () => void;
}

export function RemoveDeviceModal({ 
  open, 
  onOpenChange, 
  deviceId, 
  deviceName,
  onDeviceRemoved 
}: RemoveDeviceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1);
  
  const removeDeviceMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/devices/${deviceId}`);
    },
    onSuccess: () => {
      toast({
        title: "Device removed",
        description: "The device has been removed from your account",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      onOpenChange(false);
      onDeviceRemoved();
      // Reset the confirmation step for next time
      setConfirmationStep(1);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInitialRemove = () => {
    setConfirmationStep(2);
  };

  const handleFinalRemove = () => {
    removeDeviceMutation.mutate();
  };

  const handleCancel = () => {
    setConfirmationStep(1);
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setConfirmationStep(1);
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {confirmationStep === 1 ? (
          <div className="flex flex-col items-center text-center p-2">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl mb-1">Remove Device?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{deviceName}" from your account? This device will be made available for other users and all your device data will be deleted.
            </DialogDescription>
            
            <div className="flex justify-center gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleInitialRemove}
              >
                Remove Device
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-2">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Trash2 className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl mb-1">Permanent Data Deletion!</DialogTitle>
            <DialogDescription>
              All data associated with "{deviceName}" will be permanently deleted from the Height Tec system.
            </DialogDescription>
            
            <div className="flex justify-center gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setConfirmationStep(1)}
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleFinalRemove}
                disabled={removeDeviceMutation.isPending}
              >
                {removeDeviceMutation.isPending ? "Removing..." : "Confirm Deletion"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

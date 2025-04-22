import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

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
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRemoveDevice = () => {
    removeDeviceMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center p-2">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl mb-1">Remove Device?</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove "{deviceName}" from your account? This device will be made available for other users.
          </DialogDescription>
          
          <div className="flex justify-center gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveDevice}
              disabled={removeDeviceMutation.isPending}
            >
              {removeDeviceMutation.isPending ? "Removing..." : "Remove Device"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

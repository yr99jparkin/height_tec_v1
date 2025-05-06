import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AddDeviceRequest } from "@shared/types";

interface AddDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDeviceModal({ open, onOpenChange }: AddDeviceModalProps) {
  // Form state
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [isNewProject, setIsNewProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    deviceId?: string;
    deviceName?: string;
    newProjectName?: string;
  }>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch existing projects for this user
  const { data: projects = [] } = useQuery<string[]>({
    queryKey: ["/api/projects"],
    enabled: open, // Only fetch when modal is open
  });
  
  // Reset form when modal is opened/closed
  useEffect(() => {
    if (open) {
      // Reset form state
      setDeviceId("");
      setDeviceName("");
      setIsNewProject(false);
      setProjectName("");
      setNewProjectName("");
      setFormErrors({});
    }
  }, [open]);
  
  // Validate form
  useEffect(() => {
    const errors: {
      deviceId?: string;
      deviceName?: string;
      newProjectName?: string;
    } = {};
    
    if (!deviceId) {
      errors.deviceId = "Device ID is required";
    }
    
    if (!deviceName) {
      errors.deviceName = "Device name is required";
    }
    
    if (isNewProject && !newProjectName) {
      errors.newProjectName = "Project name is required when creating a new project";
    }
    
    setFormErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [deviceId, deviceName, isNewProject, newProjectName]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit handler 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check form validity
    if (!isFormValid) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const data: AddDeviceRequest = {
        deviceId,
        deviceName,
        project: isNewProject ? newProjectName : projectName
      };
      
      const response = await apiRequest("POST", "/api/devices", data);
      const result = await response.json();
      
      toast({
        title: "Device added successfully",
        description: "The device has been added to your account",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      // Close modal
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to add device",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Device ID */}
          <div className="space-y-2">
            <Label htmlFor="deviceId">Device ID</Label>
            <Input 
              id="deviceId"
              placeholder="Enter device ID" 
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            />
            {formErrors.deviceId && (
              <p className="text-xs text-destructive">{formErrors.deviceId}</p>
            )}
            <p className="text-xs text-neutral-500">
              Enter the Device ID provided with your anemometer.
            </p>
          </div>
          
          {/* Device Name */}
          <div className="space-y-2">
            <Label htmlFor="deviceName">Device Name</Label>
            <Input 
              id="deviceName"
              placeholder="Enter a name for this device" 
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
            />
            {formErrors.deviceName && (
              <p className="text-xs text-destructive">{formErrors.deviceName}</p>
            )}
            <p className="text-xs text-neutral-500">
              Choose a descriptive name for easy identification.
            </p>
          </div>
          
          {/* Create New Project Checkbox */}
          <div className="flex items-center space-x-2 mt-3">
            <input
              id="createNewProject"
              type="checkbox"
              className="h-4 w-4 text-primary"
              checked={isNewProject}
              onChange={(e) => setIsNewProject(e.target.checked)}
            />
            <Label htmlFor="createNewProject" className="text-sm font-normal cursor-pointer">
              Create a new project
            </Label>
          </div>
          
          {/* Project Selection */}
          {!isNewProject ? (
            <div className="space-y-2">
              <Label htmlFor="projectSelect">Device Project</Label>
              <select 
                id="projectSelect"
                className="w-full p-2 border border-input rounded-md text-base"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              >
                <option value="">Select an existing project (optional)</option>
                {projects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500">
                Group devices by project for easier management.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="newProjectName">New Project Name</Label>
              <Input 
                id="newProjectName"
                placeholder="Enter a name for the new project" 
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus={isNewProject}
              />
              {formErrors.newProjectName && (
                <p className="text-xs text-destructive">{formErrors.newProjectName}</p>
              )}
              <p className="text-xs text-neutral-500">
                Create a new project to group your devices.
              </p>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? "Adding..." : "Add Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
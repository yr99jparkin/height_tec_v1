import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AddDeviceRequest } from "@shared/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

interface AddDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const addDeviceSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  deviceName: z.string().min(1, "Device name is required"),
  project: z.string().optional(),
  isNewProject: z.boolean().default(false),
  newProjectName: z.string().optional()
}).refine(data => {
  // When creating a new project, new project name is required
  if (data.isNewProject && (!data.newProjectName || data.newProjectName.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "New project name is required when creating a new project",
  path: ["newProjectName"]
});

export function AddDeviceModal({ open, onOpenChange }: AddDeviceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const newProjectInputRef = useRef<HTMLInputElement>(null);
  const [hasRendered, setHasRendered] = useState(false);
  
  // Fetch existing projects for this user
  const { data: projects = [] } = useQuery<string[]>({
    queryKey: ["/api/projects"],
    enabled: open, // Only fetch when modal is open
  });
  
  const form = useForm<z.infer<typeof addDeviceSchema>>({
    resolver: zodResolver(addDeviceSchema),
    defaultValues: {
      deviceId: "",
      deviceName: "",
      project: "",
      isNewProject: false,
      newProjectName: ""
    }
  });

  // Watch for isNewProject changes to access in render
  const isNewProject = form.watch("isNewProject");
  
  // Reset form when modal is opened/closed
  useEffect(() => {
    if (open) {
      form.reset({
        deviceId: "",
        deviceName: "",
        project: "",
        isNewProject: false,
        newProjectName: ""
      });
      setHasRendered(false);
    }
  }, [open, form]);
  
  // Focus the new project input when isNewProject changes to true
  useEffect(() => {
    if (isNewProject && newProjectInputRef.current) {
      // Use a slightly longer timeout to ensure React has completed rendering
      const timer = setTimeout(() => {
        if (newProjectInputRef.current) {
          newProjectInputRef.current.focus();
          // Try to place cursor at the end of any text
          if (typeof newProjectInputRef.current.selectionStart === 'number') {
            newProjectInputRef.current.selectionStart = newProjectInputRef.current.value.length;
            newProjectInputRef.current.selectionEnd = newProjectInputRef.current.value.length;
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isNewProject]);
  
  // Make sure the component has fully rendered before attaching refs
  useEffect(() => {
    setHasRendered(true);
  }, []);
  
  // Handle the checkbox change with direct focus
  const handleNewProjectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    form.setValue("isNewProject", checked);
    
    if (checked) {
      // Clear the existing project if a new one is being created
      form.setValue("project", "");
    } else {
      // Clear the new project name if reverting to existing project
      form.setValue("newProjectName", "");
    }
  }, [form]);

  const addDeviceMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof addDeviceSchema>) => {
      const data: AddDeviceRequest = {
        deviceId: formData.deviceId,
        deviceName: formData.deviceName,
        project: formData.isNewProject && formData.newProjectName 
          ? formData.newProjectName 
          : formData.project
      };
      
      const response = await apiRequest("POST", "/api/devices", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device added successfully",
        description: "The device has been added to your account",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof addDeviceSchema>) => {
    addDeviceMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="deviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter device ID" 
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-neutral-500 mt-1">
                    Enter the Device ID provided with your anemometer.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="deviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter a name for this device" 
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-neutral-500 mt-1">
                    Choose a descriptive name for easy identification.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isNewProject"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2 mt-3">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-primary"
                        checked={field.value}
                        onChange={handleNewProjectChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Create a new project
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {!isNewProject ? (
              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Project</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an existing project (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project} value={project}>
                            {project}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-neutral-500 mt-1">
                      Group devices by project for easier management.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="newProjectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Project Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter a name for the new project" 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        id="new-project-input"
                        // Add key to force re-render when isNewProject changes
                        key={`new-project-${hasRendered}-${isNewProject}`}
                        autoFocus={isNewProject}
                      />
                    </FormControl>
                    <p className="text-xs text-neutral-500 mt-1">
                      Create a new project to group your devices.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                disabled={addDeviceMutation.isPending}
              >
                {addDeviceMutation.isPending ? "Adding..." : "Add Device"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

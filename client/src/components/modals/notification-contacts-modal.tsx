import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationContact } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Mail, 
  Pencil, 
  Phone, 
  Plus, 
  Trash, 
  Copy,  
  ChevronDown
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeviceWithContacts {
  deviceId: string;
  deviceName: string;
  contacts: NotificationContact[];
}

interface NotificationContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string | null;
  contacts: NotificationContact[];
}

export function NotificationContactsModal({ 
  open, 
  onOpenChange, 
  deviceId,
  contacts: initialContacts
}: NotificationContactsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contacts, setContacts] = useState<NotificationContact[]>(initialContacts);
  const [newEmail, setNewEmail] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editContactId, setEditContactId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Debug logging
  console.log("NotificationContactsModal initialContacts:", initialContacts);
  console.log("NotificationContactsModal current contacts state:", contacts);
  
  // Fetch all user devices with their contacts
  const { data: devicesWithContacts = [] } = useQuery<DeviceWithContacts[]>({
    queryKey: ["/api/user/devices-with-contacts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/devices-with-contacts");
      if (!response.ok) throw new Error("Failed to fetch devices with contacts");
      return await response.json();
    },
    enabled: open
  });
  
  // Filter out the current device from the devices list
  const otherDevices = devicesWithContacts.filter(device => device.deviceId !== deviceId);
  
  // Get contacts for the selected device
  const selectedDevice = otherDevices.find(device => device.deviceId === selectedDeviceId);

  // Start editing a contact
  const startEditing = (contact: NotificationContact) => {
    setEditContactId(contact.id);
    setEditEmail(contact.email);
    setEditPhoneNumber(contact.phoneNumber);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditContactId(null);
    setEditEmail("");
    setEditPhoneNumber("");
  };

  // Save edited contact
  const saveEditedContact = async (contactId: number) => {
    if (!deviceId) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await apiRequest("PATCH", `/api/contacts/${contactId}`, {
        email: editEmail,
        phoneNumber: editPhoneNumber
      });
      
      if (!response.ok) {
        throw new Error("Failed to update contact");
      }
      
      const updatedContact = await response.json();
      
      // Update local state
      setContacts(contacts.map(c => 
        c.id === contactId ? updatedContact : c
      ));
      
      // Reset edit state
      setEditContactId(null);
      setEditEmail("");
      setEditPhoneNumber("");
      
      toast({
        title: "Contact updated",
        description: "Notification contact has been updated successfully"
      });
      
      // Invalidate the query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${deviceId}/contacts`] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification contact",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new contact
  const addContact = async () => {
    if (!deviceId) return;
    
    if (!newEmail || !newPhoneNumber) {
      toast({
        title: "Error",
        description: "Please provide both email and phone number",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await apiRequest("POST", `/api/devices/${deviceId}/contacts`, {
        email: newEmail,
        phoneNumber: newPhoneNumber
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add contact");
      }
      
      const newContact = await response.json();
      
      // Update local state
      setContacts([...contacts, newContact]);
      
      // Reset form
      setNewEmail("");
      setNewPhoneNumber("");
      
      toast({
        title: "Contact added",
        description: "Notification contact has been added successfully"
      });
      
      // Invalidate the query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${deviceId}/contacts`] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add notification contact",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete contact
  const deleteContact = async (contactId: number) => {
    if (!deviceId) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await apiRequest("DELETE", `/api/contacts/${contactId}`);
      
      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }
      
      // Update local state
      setContacts(contacts.filter(c => c.id !== contactId));
      
      toast({
        title: "Contact deleted",
        description: "Notification contact has been deleted successfully"
      });
      
      // Invalidate the query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${deviceId}/contacts`] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification contact",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Copy contact from another device
  const copyContactFromDevice = async (contact: NotificationContact) => {
    if (!deviceId) return;
    
    try {
      setIsSubmitting(true);
      
      // Check if maximum of 5 contacts already reached
      if (contacts.length >= 5) {
        toast({
          title: "Error",
          description: "Maximum of 5 notification contacts allowed per device",
          variant: "destructive"
        });
        return;
      }
      
      const response = await apiRequest("POST", `/api/devices/${deviceId}/contacts`, {
        email: contact.email,
        phoneNumber: contact.phoneNumber
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to copy contact");
      }
      
      const newContact = await response.json();
      
      // Update local state
      setContacts([...contacts, newContact]);
      
      toast({
        title: "Contact copied",
        description: "Notification contact has been copied successfully"
      });
      
      // Invalidate the query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${deviceId}/contacts`] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to copy notification contact",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Contacts</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <p className="text-sm text-neutral-500">
            Add up to 5 email and phone number pairs that will receive notifications for this device.
          </p>
          
          {/* Current Contacts */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Current Contacts</h3>
            
            {contacts.length === 0 ? (
              <p className="text-sm text-neutral-500 italic">No contacts added yet</p>
            ) : (
              <div className="space-y-2">
                {contacts.map(contact => (
                  <div 
                    key={contact.id} 
                    className="flex flex-col border border-neutral-200 rounded p-3"
                  >
                    {editContactId === contact.id ? (
                      // Edit mode
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-neutral-500" />
                          <Input 
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="Email address"
                            className="h-8"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-neutral-500" />
                          <Input 
                            value={editPhoneNumber}
                            onChange={(e) => setEditPhoneNumber(e.target.value)}
                            placeholder="Phone number"
                            className="h-8"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditing}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => saveEditedContact(contact.id)}
                            disabled={isSubmitting}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-neutral-500" />
                          <span className="text-sm">{contact.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Phone className="h-4 w-4 text-neutral-500" />
                          <span className="text-sm">{contact.phoneNumber}</span>
                        </div>
                        <div className="flex justify-end space-x-2 mt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditing(contact)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteContact(contact.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Copy Contacts from Other Devices */}
          {contacts.length < 5 && otherDevices.length > 0 && (
            <div className="border-t border-neutral-200 pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">Copy Contacts from Other Devices</h3>
              
              <div className="space-y-3">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="deviceSelect">Select Device</Label>
                  <Select 
                    value={selectedDeviceId} 
                    onValueChange={(value) => setSelectedDeviceId(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherDevices.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.deviceName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedDevice && selectedDevice.contacts.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-600">Available contacts:</p>
                    {selectedDevice.contacts.map(contact => (
                      <div 
                        key={contact.id} 
                        className="flex justify-between items-center border border-neutral-200 rounded p-2"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-3 w-3 text-neutral-500" />
                            <span className="text-xs">{contact.email}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Phone className="h-3 w-3 text-neutral-500" />
                            <span className="text-xs">{contact.phoneNumber}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyContactFromDevice(contact)}
                          disabled={isSubmitting || contacts.some(c => 
                            c.email === contact.email && c.phoneNumber === contact.phoneNumber
                          )}
                          className="h-8"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : selectedDevice ? (
                  <p className="text-sm text-neutral-500 italic">No contacts found for this device</p>
                ) : (
                  <p className="text-sm text-neutral-500 italic">Select a device to view available contacts</p>
                )}
              </div>
            </div>
          )}
          
          {/* Add New Contact */}
          {contacts.length < 5 && (
            <div className="border-t border-neutral-200 pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">Add New Contact</h3>
              <div className="space-y-3">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-neutral-500" />
                    <Input
                      id="email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-neutral-500" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                
                <Button
                  type="button"
                  className="w-full"
                  onClick={addContact}
                  disabled={isSubmitting || !newEmail || !newPhoneNumber}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
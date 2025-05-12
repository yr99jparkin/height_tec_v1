import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect } from "wouter";
import { Header } from "@/components/layout/header";
import { 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Mail, 
  RefreshCw, 
  Search, 
  AlertTriangle,
  XCircle, 
  MailX,
  BadgeAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { format } from "date-fns";
import { EmailBounceInfo, ContactWithBounceInfo, BounceApiResponse } from "@shared/types";
import { apiRequest } from "@/lib/queryClient";

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return format(date, "dd/MM/yyyy HH:mm");
}

function getStatusColorForBounceType(type: string): "default" | "destructive" | "outline" | "secondary" {
  switch (type) {
    case "HardBounce":
    case "SpamComplaint":
    case "Blocked":
      return "destructive";
    case "SoftBounce":
    case "SubscriptionExpired":
    case "AutoResponder":
      return "secondary";
    default:
      return "outline";
  }
}

function getStatusTextForBounce(bounce: EmailBounceInfo): string {
  if (bounce.inactive) return "Reactivated";
  if (!bounce.canActivate) return "Cannot Reactivate";
  return bounce.type;
}

export default function AdminBouncesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [emailToReactivate, setEmailToReactivate] = useState<string | null>(null);

  // If the user is not an admin, redirect to home
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }
  
  // Fetch bounces from the server
  const { 
    data: bounces, 
    isLoading: isLoadingBounces, 
    isError: isErrorBounces, 
    refetch: refetchBounces
  } = useQuery<EmailBounceInfo[]>({
    queryKey: ['/api/admin/bounces'],
    refetchOnWindowFocus: false,
  });
  
  // Fetch notification contacts with bounce counts
  const { 
    data: contactsWithBounces, 
    isLoading: isLoadingContacts, 
    isError: isErrorContacts, 
    refetch: refetchContacts
  } = useQuery<ContactWithBounceInfo[]>({
    queryKey: ['/api/admin/bounces/contacts'],
    refetchOnWindowFocus: false,
  });

  // Sync bounces with Postmark
  const syncBouncesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/bounces/sync', {
        method: 'POST'
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Complete",
        description: data.message || "Successfully synced with Postmark",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bounces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bounces/contacts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with Postmark API",
        variant: "destructive",
      });
    }
  });

  // Reactivate email
  const reactivateEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest('/api/admin/bounces/reactivate', {
        method: 'POST',
        body: { email }
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Reactivation Complete",
        description: data.message || "Successfully reactivated email",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bounces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bounces/contacts'] });
      setEmailToReactivate(null); // Close dialog
    },
    onError: (error: any) => {
      toast({
        title: "Reactivation Failed",
        description: error.message || "Failed to reactivate email",
        variant: "destructive",
      });
    }
  });
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetchBounces();
    refetchContacts();
    toast({
      title: "Refreshing data",
      description: "Fetching the latest data from the server",
    });
  };
  
  // Handle sync button click
  const handleSync = () => {
    syncBouncesMutation.mutate();
  };

  // Handle reactivate email
  const handleReactivateEmail = (email: string) => {
    setEmailToReactivate(email);
  };

  // Handle confirm reactivation
  const handleConfirmReactivation = () => {
    if (emailToReactivate) {
      reactivateEmailMutation.mutate(emailToReactivate);
    }
  };

  // Filter bounces and contacts based on search term
  const filteredBounces = bounces?.filter(bounce => 
    bounce.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bounce.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bounce.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContacts = contactsWithBounces?.filter(contact => 
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.deviceId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-heading font-semibold text-neutral-800 flex items-center">
            <MailX className="mr-2 h-6 w-6" />
            Email Bounce Management
          </h1>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isLoadingBounces || isLoadingContacts}
              className="flex items-center"
            >
              {isLoadingBounces || isLoadingContacts ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Data
            </Button>
            
            <Button 
              variant="default" 
              size="sm"
              onClick={handleSync}
              disabled={syncBouncesMutation.isPending}
              className="flex items-center"
            >
              {syncBouncesMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Sync with Postmark
            </Button>
          </div>
        </div>
        
        {(isErrorBounces || isErrorContacts) && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading data</AlertTitle>
            <AlertDescription>
              There was an error fetching email bounce data. Please try refreshing.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by email, device ID, or bounce type..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="contacts" className="w-full mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="contacts">
              <BadgeAlert className="mr-2 h-4 w-4" /> 
              Contacts with Bounces
            </TabsTrigger>
            <TabsTrigger value="bounces">
              <MailX className="mr-2 h-4 w-4" />
              All Email Bounces
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle>Notification Contacts with Bounce Issues</CardTitle>
                <CardDescription>
                  This table shows notification contacts that have experienced email bounces, sorted by bounce count
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>
                    {contactsWithBounces?.length 
                      ? `${contactsWithBounces.length} contacts found, ${filteredContacts?.length ?? 0} shown with current filter`
                      : "No contacts with bounces found"}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Device ID</TableHead>
                      <TableHead className="text-center">Bounce Count</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingContacts ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">Loading contact data...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredContacts?.length ? (
                      filteredContacts.map(contact => (
                        <TableRow key={`${contact.id}-${contact.deviceId}`}>
                          <TableCell className="font-medium">{contact.email}</TableCell>
                          <TableCell>{contact.deviceId}</TableCell>
                          <TableCell className="text-center">
                            {contact.bounceCount > 0 ? (
                              <Badge variant={contact.bounceCount > 2 ? "destructive" : "secondary"}>
                                {contact.bounceCount}
                              </Badge>
                            ) : (
                              <Badge variant="outline">0</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {contact.bounceCount > 0 ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleReactivateEmail(contact.email)}
                                disabled={reactivateEmailMutation.isPending}
                              >
                                {reactivateEmailMutation.isPending && reactivateEmailMutation.variables === contact.email ? (
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="mr-2 h-3 w-3" />
                                )}
                                Reactivate
                              </Button>
                            ) : (
                              <Badge variant="outline" className="bg-green-50">
                                <CheckCircle className="mr-1 h-3 w-3" /> Active
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <p className="text-sm text-muted-foreground">No contacts match your search criteria</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="bounces">
            <Card>
              <CardHeader>
                <CardTitle>All Email Bounces</CardTitle>
                <CardDescription>
                  Detailed list of all email bounces recorded from Postmark
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>
                    {bounces?.length 
                      ? `${bounces.length} bounces found, ${filteredBounces?.length ?? 0} shown with current filter`
                      : "No bounce data found"}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Bounced At</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingBounces ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">Loading bounce data...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredBounces?.length ? (
                      filteredBounces.map(bounce => (
                        <TableRow key={bounce.id}>
                          <TableCell className="font-medium">{bounce.email}</TableCell>
                          <TableCell>{bounce.type}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={bounce.description}>
                            {bounce.description}
                          </TableCell>
                          <TableCell>{formatDateTime(bounce.bouncedAt)}</TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant={bounce.inactive ? "outline" : getStatusColorForBounceType(bounce.type)} 
                              className={bounce.inactive ? "bg-green-50" : ""}
                            >
                              {bounce.inactive ? (
                                <>
                                  <CheckCircle className="mr-1 h-3 w-3" /> 
                                  Reactivated
                                </>
                              ) : !bounce.canActivate ? (
                                <>
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Cannot Reactivate
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  {bounce.type}
                                </>
                              )}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <p className="text-sm text-muted-foreground">No bounces match your search criteria</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Email Reactivation Confirmation Dialog */}
      <Dialog open={!!emailToReactivate} onOpenChange={(open) => !open && setEmailToReactivate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Email</DialogTitle>
            <DialogDescription>
              This will tell Postmark to attempt reactivation of the email address. 
              Future emails to this address will be delivered again.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-2">Are you sure you want to reactivate:</p>
            <p className="font-medium text-center p-2 bg-slate-100 rounded-md">
              {emailToReactivate}
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEmailToReactivate(null)}
              disabled={reactivateEmailMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmReactivation}
              disabled={reactivateEmailMutation.isPending}
            >
              {reactivateEmailMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Reactivate Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
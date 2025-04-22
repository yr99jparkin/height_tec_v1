import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, LogOut, Settings, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/auth");
  };

  // Extract initials for avatar
  const getInitials = () => {
    if (!user?.fullName) return "U";
    const names = user.fullName.split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <header className="bg-white border-b border-neutral-300 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="font-heading text-2xl font-bold text-primary">Height Tec</h1>
        </div>
        <div className="flex items-center space-x-4">
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {/* Notification indicator dot */}
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b border-neutral-300">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {/* Example notification - in production these would come from a real source */}
                <div className="p-3 border-b border-neutral-200 hover:bg-neutral-100">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <span className="h-8 w-8 rounded-full bg-destructive flex items-center justify-center text-white">
                        <i className="fas fa-exclamation-triangle text-sm"></i>
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">No active notifications</p>
                      <p className="text-xs text-neutral-500">Notifications will appear here</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2 border-t border-neutral-300 text-center">
                <Button variant="link" className="text-sm text-primary">
                  View all notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 text-neutral-700 hover:text-primary">
                <span className="font-medium text-sm hidden md:block">{user?.fullName}</span>
                <div className="h-8 w-8 rounded-full bg-primary-100 text-primary flex items-center justify-center">
                  <span className="font-medium text-sm">{getInitials()}</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help Center</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4 text-destructive" />
                <span className="text-destructive">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

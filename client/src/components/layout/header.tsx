import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/auth");
  };
  
  const goToDashboard = () => {
    setLocation("/app");
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
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <div 
            className="font-heading text-2xl font-bold text-primary italic flex items-center gap-2 cursor-pointer" 
            onClick={goToDashboard}
          >
            <img src="/logo2.png" alt="Height-tec logo" className="w-16 h-16" />
            Height-tec
          </div>
        </div>
        <div className="flex items-center">
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
              <DropdownMenuItem onClick={goToDashboard}>
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                <span>Dashboard</span>
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
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, Wind } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { UpdateSpeedUnitRequest } from "@shared/types";

export function Header() {
  const { user, logoutMutation, updateSpeedUnitMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/auth");
  };
  
  const handleUnitChange = (value: string) => {
    if (value === user?.speedUnit) return;
    
    updateSpeedUnitMutation.mutate({
      speedUnit: value
    });
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
          <h1 className="font-heading text-2xl font-bold text-primary flex items-center gap-2">
            <img 
              src="/height-tec-logo.png" 
              alt="Height-tec logo" 
              className="h-10 cursor-pointer" 
              onClick={() => setLocation("/")}
            />
          </h1>
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
              <DropdownMenuLabel>Wind Speed Unit</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={user?.speedUnit || 'km/h'} onValueChange={handleUnitChange}>
                <DropdownMenuRadioItem value="km/h">
                  <Wind className="mr-2 h-4 w-4" />
                  <span>km/h</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="m/s">
                  <Wind className="mr-2 h-4 w-4" />
                  <span>m/s</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              
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
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Wind, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();
  
  // Navigation items
  const navItems = [
    { icon: Wind, label: "Devices", href: "/" },
    { icon: BarChart2, label: "Reports", href: "/reports" }
  ];

  return (
    <aside className="w-16 md:w-64 bg-white border-r border-neutral-300 flex-shrink-0">
      <nav className="p-4 h-full">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full flex items-center py-2 px-3 md:px-4 rounded-md",
                    isActive 
                      ? "text-primary bg-primary-50 font-medium" 
                      : "text-neutral-600 hover:bg-neutral-100"
                  )}
                  asChild
                >
                  <a href={item.href}>
                    <item.icon className="h-5 w-5 md:h-4 md:w-4 mr-0 md:mr-2" />
                    <span className="hidden md:inline">{item.label}</span>
                  </a>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

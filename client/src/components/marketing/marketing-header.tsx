import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const navItems = [
    { label: "Product", href: "/features" },
    { label: "Solutions", href: "/solutions" },
    { label: "Pricing", href: "/pricing" },
    { label: "Company", href: "/about" },
  ];

  return (
    <header className="bg-white w-full z-50 py-4 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/">
            <a className="flex items-center">
              <h1 className="font-heading text-2xl font-bold text-primary italic flex items-center gap-2">
                <img src="/logo2.png" alt="Height-tec logo" className="w-9 h-9" />
                Height-tec
              </h1>
            </a>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <a className="text-gray-600 hover:text-primary font-medium text-sm transition-colors">
                {item.label}
              </a>
            </Link>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          <Link href="/auth">
            <a className="text-gray-600 hover:text-primary font-medium text-sm">
              Sign in
            </a>
          </Link>
          <Link href="/auth">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              Sign up
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-600"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-md z-50 border-t">
          <div className="px-6 py-4 space-y-4">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <a className="block text-gray-600 hover:text-primary font-medium" onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </a>
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-200 flex flex-col space-y-3">
              <Link href="/auth">
                <a className="text-gray-600 hover:text-primary font-medium" onClick={() => setMobileMenuOpen(false)}>
                  Sign in
                </a>
              </Link>
              <Link href="/auth">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white" onClick={() => setMobileMenuOpen(false)}>
                  Sign up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
import React from "react";
import { MarketingHeader } from "./marketing-header";
import { MarketingFooter } from "./marketing-footer";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <MarketingHeader />
      <main className="flex-grow">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeatureSection, FeatureItem } from "@/components/marketing/feature-section";
import { 
  Building2, 
  Shield, 
  Wind, 
  HardHat, 
  BarChart3, 
  AlarmCheck,
  MapPin,
  Bell
} from "lucide-react";

export default function HomePage() {
  // Feature items for the feature section
  const features: FeatureItem[] = [
    {
      title: "Live Wind Data",
      description: "Get real-time wind speeds and alerts directly from your construction sites",
      icon: <Wind className="h-6 w-6" />
    },
    {
      title: "Safety Compliance",
      description: "Ensure workplace safety and regulatory compliance with accurate monitoring",
      icon: <Shield className="h-6 w-6" />
    },
    {
      title: "Multiple Sites",
      description: "Monitor and manage all your construction sites from a single dashboard",
      icon: <Building2 className="h-6 w-6" />
    },
    {
      title: "Designed for Construction",
      description: "Built specifically for construction companies, crane operators, and safety managers",
      icon: <HardHat className="h-6 w-6" />
    },
    {
      title: "Advanced Analytics",
      description: "Analyze wind patterns and trends to make data-driven decisions",
      icon: <BarChart3 className="h-6 w-6" />
    },
    {
      title: "Real-time Alerts",
      description: "Receive immediate notifications when wind speeds exceed safety thresholds",
      icon: <Bell className="h-6 w-6" />
    }
  ];

  // Create card component for hero section
  const HeroImageComponent = () => (
    <div className="relative">
      <div className="absolute -left-4 -top-4 w-72 h-60 bg-primary/10 rounded-lg"></div>
      <div className="relative bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200 z-10">
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Site #4872</h3>
              <div className="flex items-center mt-1">
                <MapPin className="h-4 w-4 text-gray-500 mr-1" />
                <span className="text-sm text-gray-500">Downtown Construction Project</span>
              </div>
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
              Active
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Current Wind Speed</span>
              <span className="text-2xl font-bold text-primary">24.5 mph</span>
            </div>
            
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '65%' }}></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-sm text-gray-500 block">Amber Alert</span>
                <span className="text-lg font-semibold">25 mph</span>
              </div>
              <div>
                <span className="text-sm text-gray-500 block">Red Alert</span>
                <span className="text-lg font-semibold">35 mph</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center">
              <AlarmCheck className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-600">Last checked: <strong>2 minutes ago</strong></span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute -right-4 -bottom-4 w-60 h-60 bg-primary/5 rounded-lg"></div>
    </div>
  );

  return (
    <MarketingLayout>
      <HeroSection
        title="Real-time Wind Monitoring for Construction Safety"
        subtitle="Monitor wind speeds in real-time from your remote construction sites with cloud-connected anemometers. Make data-driven safety decisions and ensure regulatory compliance."
        ctaText="Get Started"
        secondaryCtaText="Learn More"
        secondaryCtaLink="/features"
        imageComponent={<HeroImageComponent />}
      />
      
      <FeatureSection
        title="Designed for Construction Safety"
        subtitle="Our platform provides the tools you need to monitor wind conditions and ensure safety compliance at all your construction sites."
        features={features}
      />
      
      <div className="bg-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Ready to ensure construction site safety?</h2>
          <p className="text-xl text-white/80 mb-10 max-w-3xl mx-auto">
            Join construction companies that trust Height-tec to monitor wind conditions and ensure worker safety.
          </p>
          <a href="/auth" className="inline-block bg-white text-primary px-8 py-3 rounded-md font-medium text-lg hover:bg-gray-100 transition-colors">
            Start Monitoring Today
          </a>
        </div>
      </div>
    </MarketingLayout>
  );
}
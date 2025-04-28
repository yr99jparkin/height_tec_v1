import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeatureSection, FeatureItem } from "@/components/marketing/feature-section";
import { 
  Wind, 
  Bell,
  BarChart3,
  Smartphone,
  Cloud,
  Users,
  ExternalLink,
  Zap,
  Map 
} from "lucide-react";

export default function FeaturesPage() {
  const mainFeatures: FeatureItem[] = [
    {
      title: "Real-time Monitoring",
      description: "Get instant wind speed data from all your devices with automatic updates every minute",
      icon: <Wind className="h-6 w-6" />
    },
    {
      title: "Custom Alert Thresholds",
      description: "Set customized alert thresholds for each site based on your specific safety requirements",
      icon: <Bell className="h-6 w-6" />
    },
    {
      title: "Advanced Analytics",
      description: "View historical data trends and generate reports for safety compliance documentation",
      icon: <BarChart3 className="h-6 w-6" />
    },
    {
      title: "Mobile Accessibility",
      description: "Access your wind monitoring dashboard from any device with our responsive web application",
      icon: <Smartphone className="h-6 w-6" />
    },
  ];

  const technicalFeatures: FeatureItem[] = [
    {
      title: "Cloud-Based Architecture",
      description: "Reliably store and process wind data with our scalable cloud infrastructure",
      icon: <Cloud className="h-6 w-6" />
    },
    {
      title: "Multi-user Support",
      description: "Provide access to team members with role-based permissions and controls",
      icon: <Users className="h-6 w-6" />
    },
    {
      title: "API Integration",
      description: "Connect with other construction management software through our REST API",
      icon: <ExternalLink className="h-6 w-6" />
    },
    {
      title: "Low Latency Updates",
      description: "Experience immediate data transmission with our optimized UDP protocol",
      icon: <Zap className="h-6 w-6" />
    },
  ];

  // Hero section image component
  const MapViewComponent = () => (
    <div className="relative rounded-lg overflow-hidden shadow-xl border border-gray-200">
      <div className="absolute inset-0 bg-gray-200">
        {/* Simulated map with site markers */}
        <div className="h-full w-full bg-gray-100 relative">
          {/* Map background with grid */}
          <div className="h-full w-full absolute" style={{
            backgroundImage: "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(to right, #e5e7eb 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }}></div>
          
          {/* Site markers */}
          <div className="absolute top-1/4 left-1/3 bg-primary text-white rounded-full p-2">
            <Map className="h-4 w-4" />
          </div>
          <div className="absolute top-1/2 left-2/3 bg-primary text-white rounded-full p-2">
            <Map className="h-4 w-4" />
          </div>
          <div className="absolute bottom-1/4 left-1/2 bg-red-500 text-white rounded-full p-2 animate-pulse">
            <Map className="h-4 w-4" />
          </div>
          <div className="absolute top-2/3 left-1/4 bg-primary text-white rounded-full p-2">
            <Map className="h-4 w-4" />
          </div>
          
          {/* Alert radius */}
          <div className="absolute bottom-1/4 left-1/2 rounded-full bg-red-500/20 animate-ping" 
            style={{width: "80px", height: "80px", marginLeft: "-40px", marginTop: "-40px"}}></div>
        </div>
      </div>
      <div className="h-80"></div>
    </div>
  );

  return (
    <MarketingLayout>
      <HeroSection
        title="Powerful Features for Construction Wind Monitoring"
        subtitle="Explore all the tools and capabilities that make Height-tec the leading solution for wind safety in construction sites."
        imageComponent={<MapViewComponent />}
        secondaryCtaText="Contact Sales"
        secondaryCtaLink="/contact"
      />
      
      <FeatureSection
        title="Core Capabilities"
        subtitle="Our platform provides comprehensive wind monitoring solutions designed specifically for construction safety"
        features={mainFeatures}
        columns={4}
      />
      
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row gap-12 items-center">
                <div className="w-full md:w-1/2">
                  <h2 className="text-3xl font-bold mb-6">Device Management</h2>
                  <p className="text-gray-600 mb-6">
                    Easily add, monitor, and manage all your wind measurement devices from a central dashboard. 
                    Track device status, battery levels, and connectivity with real-time updates.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Quick device registration",
                      "Status monitoring with alerts",
                      "Project-based organization",
                      "Geolocation tracking",
                      "Automatic wind threshold configuration"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start">
                        <div className="mr-3 text-primary">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="w-full md:w-1/2">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-medium">Devices Overview</h3>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">12 Active</span>
                    </div>
                    
                    {[1, 2, 3].map(i => (
                      <div key={i} className="mb-4 p-3 bg-white rounded-md border border-gray-200 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">Device-{i}00{i}</p>
                          <p className="text-xs text-gray-500">Downtown Project</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{14 + i * 3}.2 mph</p>
                          <p className="text-xs text-green-600">Online</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <FeatureSection
        title="Technical Features"
        subtitle="Powered by sophisticated technology to ensure reliability and performance"
        features={technicalFeatures}
        columns={4}
      />
      
      <div className="bg-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Get started with Height-tec today</h2>
          <p className="text-xl text-white/80 mb-10 max-w-3xl mx-auto">
            Join construction companies that trust Height-tec to monitor wind conditions and ensure worker safety.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/auth" className="inline-block bg-white text-primary px-8 py-3 rounded-md font-medium text-lg hover:bg-gray-100 transition-colors">
              Start Free Trial
            </a>
            <a href="/pricing" className="inline-block bg-primary border border-white text-white px-8 py-3 rounded-md font-medium text-lg hover:bg-primary/90 transition-colors">
              View Pricing
            </a>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
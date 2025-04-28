import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
  priceSubtext?: string;
}

export default function PricingPage() {
  const pricingTiers: PricingTier[] = [
    {
      name: "Starter",
      price: "$299",
      priceSubtext: "per month",
      description: "Perfect for small construction projects with limited monitoring needs",
      features: [
        "Up to 5 monitoring devices",
        "Real-time wind speed data",
        "Basic alerting system",
        "7-day data history",
        "Email notifications",
        "Standard support"
      ],
      ctaText: "Start Free Trial",
    },
    {
      name: "Professional",
      price: "$599",
      priceSubtext: "per month",
      description: "Ideal for medium-sized construction companies with multiple active sites",
      features: [
        "Up to 15 monitoring devices",
        "Real-time wind speed data",
        "Advanced alert configuration",
        "30-day data history",
        "Email and SMS notifications",
        "API access",
        "Priority support",
        "Custom threshold settings"
      ],
      isPopular: true,
      ctaText: "Start Free Trial",
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Tailored solution for large construction firms with complex requirements",
      features: [
        "Unlimited monitoring devices",
        "Real-time wind speed data",
        "Advanced alert configuration",
        "1-year data history",
        "Multi-channel notifications",
        "Full API access",
        "Premium 24/7 support",
        "Custom threshold settings",
        "Dedicated account manager",
        "Custom integrations"
      ],
      ctaText: "Contact Sales",
    }
  ];

  return (
    <MarketingLayout>
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that works for your construction safety needs. All plans include our core wind monitoring technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier) => (
              <div 
                key={tier.name}
                className={`rounded-xl border ${tier.isPopular ? 'border-primary shadow-lg shadow-primary/10' : 'border-gray-200'} overflow-hidden`}
              >
                {tier.isPopular && (
                  <div className="bg-primary text-white text-center py-2 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{tier.name}</h3>
                  <div className="flex items-baseline mb-5">
                    <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                    {tier.priceSubtext && (
                      <span className="ml-2 text-gray-500">{tier.priceSubtext}</span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-6">{tier.description}</p>
                  
                  <Button 
                    className={`w-full ${tier.isPopular ? 'bg-primary hover:bg-primary/90' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
                  >
                    {tier.ctaText}
                  </Button>
                  
                  <div className="mt-8 space-y-4">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mr-3 mt-0.5" />
                        <span className="text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <div className="max-w-3xl mx-auto">
              <div className="grid gap-6 md:gap-8">
                {[
                  {
                    question: "How do the wind monitoring devices work?",
                    answer: "Our wind monitoring devices use advanced anemometer technology to measure wind speed accurately. Data is transmitted via cellular networks to our cloud platform for real-time processing and alerting."
                  },
                  {
                    question: "Can I change plans later?",
                    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle."
                  },
                  {
                    question: "Is there a setup fee?",
                    answer: "No, there are no setup fees. You only pay the monthly subscription fee for your chosen plan."
                  },
                  {
                    question: "Do I need to purchase hardware separately?",
                    answer: "Yes, wind monitoring devices are purchased separately. Contact our sales team for hardware pricing and compatibility information."
                  },
                ].map((faq, i) => (
                  <div key={i} className="text-left border-b border-gray-200 pb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Still have questions?</h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Our team is ready to help you find the perfect solution for your construction wind monitoring needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-primary hover:bg-primary/90 text-white" size="lg">
              Contact Sales
            </Button>
            <Button variant="outline" size="lg">
              View Documentation
            </Button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
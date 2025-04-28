import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ReactNode } from "react";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  imageComponent?: ReactNode;
  imagePosition?: 'right' | 'left';
  imageAlt?: string;
  darkMode?: boolean;
}

export function HeroSection({
  title,
  subtitle,
  ctaText = "Get Started",
  ctaLink = "/auth",
  secondaryCtaText,
  secondaryCtaLink,
  imageComponent,
  imagePosition = 'right',
  darkMode = false,
}: HeroSectionProps) {
  const textColor = darkMode ? "text-white" : "text-gray-900";
  const bgColor = darkMode ? "bg-gray-900" : "bg-white";
  const subtitleColor = darkMode ? "text-gray-300" : "text-gray-600";

  return (
    <section className={`py-20 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className={`flex flex-col ${imagePosition === 'left' ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12`}>
          {/* Text Content */}
          <div className="w-full md:w-1/2 space-y-6">
            <h1 className={`font-heading text-4xl lg:text-5xl xl:text-6xl font-bold ${textColor} leading-tight`}>
              {title}
            </h1>
            <p className={`text-lg lg:text-xl ${subtitleColor} leading-relaxed`}>
              {subtitle}
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              {ctaText && (
                <Link href={ctaLink}>
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-medium">
                    {ctaText}
                  </Button>
                </Link>
              )}
              {secondaryCtaText && (
                <Link href={secondaryCtaLink || "#"}>
                  <Button size="lg" variant="outline" className={`${darkMode ? 'border-white text-white' : 'border-gray-300'} font-medium`}>
                    {secondaryCtaText}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Image Content */}
          {imageComponent && (
            <div className="w-full md:w-1/2">
              {imageComponent}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
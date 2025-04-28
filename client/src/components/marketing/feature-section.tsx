import { ReactNode } from "react";

export interface FeatureItem {
  title: string;
  description: string;
  icon: ReactNode;
}

interface FeatureSectionProps {
  title: string;
  subtitle: string;
  features: FeatureItem[];
  columns?: 2 | 3 | 4;
  darkMode?: boolean;
}

export function FeatureSection({
  title,
  subtitle,
  features,
  columns = 3,
  darkMode = false,
}: FeatureSectionProps) {
  const bgColor = darkMode ? "bg-gray-900" : "bg-white";
  const textColor = darkMode ? "text-white" : "text-gray-900";
  const subtitleColor = darkMode ? "text-gray-300" : "text-gray-600";
  const featureBgColor = darkMode ? "bg-gray-800" : "bg-gray-50";
  const featureHoverBgColor = darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100";
  
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className={`py-20 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <h2 className={`font-heading text-3xl md:text-4xl font-bold ${textColor} mb-4`}>
            {title}
          </h2>
          <p className={`max-w-3xl mx-auto ${subtitleColor} text-lg`}>
            {subtitle}
          </p>
        </div>

        <div className={`grid grid-cols-1 ${gridCols[columns]} gap-8`}>
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`${featureBgColor} ${featureHoverBgColor} p-8 rounded-lg transition-all duration-200 border border-transparent hover:border-primary/20`}
            >
              <div className="bg-primary/10 text-primary w-12 h-12 flex items-center justify-center rounded-lg mb-5">
                {feature.icon}
              </div>
              <h3 className={`font-heading text-xl font-semibold ${textColor} mb-3`}>
                {feature.title}
              </h3>
              <p className={`${subtitleColor}`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
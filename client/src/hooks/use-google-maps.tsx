import { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: null,
});

// Declare global types
declare global {
  interface Window {
    google: any;
  }
}

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    // Skip if maps are already loaded or loading
    if (window.google?.maps || document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      setIsLoaded(true);
      return;
    }

    // Create the script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    
    // Set event handlers
    script.onload = () => {
      console.log('Google Maps API loaded');
      setIsLoaded(true);
    };
    
    script.onerror = () => {
      setLoadError(new Error('Failed to load Google Maps API'));
      console.error('Failed to load Google Maps API');
    };

    // Append the script to the document head
    document.head.appendChild(script);

    // Clean up function
    return () => {
      // We don't remove the script on unmount because we want to keep the API loaded
    };
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}
import React, { useEffect, useRef, memo } from 'react';
import { DeviceWithLatestData } from '@shared/types';
import { useGoogleMaps } from '@/hooks/use-google-maps';

interface GoogleMapProps {
  devices: DeviceWithLatestData[];
  onDeviceClick?: (deviceId: string) => void;
}

// Component implementation
function GoogleMapComponent({ devices, onDeviceClick }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { isLoaded, loadError } = useGoogleMaps();

  useEffect(() => {
    // Only initialize the map once the Google Maps API is loaded
    if (!isLoaded || !window.google?.maps) return;
    
    // Initialize the map
    const initMap = () => {
      if (!mapRef.current) return;

      const devicesWithCoords = devices.filter(d => d.latitude && d.longitude);

      if (devicesWithCoords.length === 0) {
        // Default map centered on Australia if no devices
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: -25.2744, lng: 133.7751 },
          zoom: 4,
          mapTypeControl: false,
          streetViewControl: false,
        });
        return;
      }

      // Calculate the bounds of all device locations
      const bounds = new window.google.maps.LatLngBounds();
      
      // Calculate center of map
      let center;
      if (devicesWithCoords.length === 1) {
        center = { 
          lat: devicesWithCoords[0].latitude as number, 
          lng: devicesWithCoords[0].longitude as number 
        };
      } else {
        // Calculate the average of all coordinates
        const avgLat = devicesWithCoords.reduce((sum, d) => sum + (d.latitude || 0), 0) / devicesWithCoords.length;
        const avgLng = devicesWithCoords.reduce((sum, d) => sum + (d.longitude || 0), 0) / devicesWithCoords.length;
        center = { lat: avgLat, lng: avgLng };
      }

      // Initialize the map
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: devicesWithCoords.length === 1 ? 15 : 4,
        mapTypeControl: false,
        streetViewControl: false,
      });

      // Add markers for each device
      markersRef.current = devicesWithCoords.map(device => {
        const position = { 
          lat: device.latitude as number, 
          lng: device.longitude as number 
        };
        
        // Add the position to bounds for automatic zooming
        bounds.extend(position);

        // Create info window content
        const infoWindowContent = `
          <div style="padding: 10px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px;">${device.deviceName}</h3>
            <p style="margin: 0; font-size: 12px;">
              Wind Speed: ${typeof device.avgWindSpeed === 'number' ? device.avgWindSpeed.toFixed(1) : Number(device.avgWindSpeed).toFixed(1)} km/h
            </p>
          </div>
        `;

        const infoWindow = new window.google.maps.InfoWindow({
          content: infoWindowContent,
        });

        // Create marker
        const marker = new window.google.maps.Marker({
          position,
          map: mapInstanceRef.current,
          title: device.deviceName,
          animation: window.google.maps.Animation.DROP,
        });

        // Add click event to marker
        marker.addListener('click', () => {
          if (onDeviceClick) {
            onDeviceClick(device.deviceId);
          } else {
            infoWindow.open(mapInstanceRef.current, marker);
          }
        });

        return marker;
      });

      // Adjust map bounds to fit all markers if multiple devices
      if (devicesWithCoords.length > 1) {
        mapInstanceRef.current.fitBounds(bounds);
        
        // Set a minimum zoom level
        const zoomChangedListener = mapInstanceRef.current.addListener('idle', () => {
          if (mapInstanceRef.current.getZoom() > 10) {
            mapInstanceRef.current.setZoom(10);
          }
          window.google.maps.event.removeListener(zoomChangedListener);
        });
      }
    };

    // Initialize map when Google Maps is loaded
    initMap();

    // Clean up
    return () => {
      if (markersRef.current) {
        markersRef.current.forEach(marker => {
          marker.setMap(null);
        });
      }
    };
  }, [isLoaded, devices, onDeviceClick]);

  // Update markers when devices change
  useEffect(() => {
    // Make sure Google Maps is loaded and map is initialized
    if (!isLoaded || !mapInstanceRef.current || !window.google?.maps) return;

    // Clear existing markers
    if (markersRef.current) {
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current = [];
    }

    const devicesWithCoords = devices.filter(d => d.latitude && d.longitude);
    if (devicesWithCoords.length === 0) return;

    // Create new bounds
    const bounds = new window.google.maps.LatLngBounds();

    // Add markers for each device
    markersRef.current = devicesWithCoords.map(device => {
      const position = { lat: device.latitude as number, lng: device.longitude as number };
      bounds.extend(position);

      // Create marker
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: device.deviceName,
      });

      // Create info window content
      const infoWindowContent = `
        <div style="padding: 10px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px;">${device.deviceName}</h3>
          <p style="margin: 0; font-size: 12px;">
            Wind Speed: ${typeof device.avgWindSpeed === 'number' ? device.avgWindSpeed.toFixed(1) : Number(device.avgWindSpeed).toFixed(1)} km/h
          </p>
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({
        content: infoWindowContent,
      });

      // Add click event to marker
      marker.addListener('click', () => {
        if (onDeviceClick) {
          onDeviceClick(device.deviceId);
        } else {
          infoWindow.open(mapInstanceRef.current, marker);
        }
      });

      return marker;
    });

    // Adjust map bounds to fit all markers if multiple devices
    if (devicesWithCoords.length > 1) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [isLoaded, devices, onDeviceClick]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-100 rounded-md">
        <p className="text-neutral-600">Failed to load map. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 rounded-md z-10">
          <p className="text-neutral-600">Loading map...</p>
        </div>
      )}
      <div 
        ref={mapRef} 
        className="h-full w-full rounded-lg" 
        style={{ opacity: isLoaded ? 1 : 0 }}
      />
    </div>
  );
}

// Custom equality function for React.memo to prevent unnecessary re-renders
function areDevicesEqual(prevProps: GoogleMapProps, nextProps: GoogleMapProps) {
  // If there's a different number of devices, they're not equal
  if (prevProps.devices.length !== nextProps.devices.length) {
    return false;
  }

  // Compare each device's critical properties
  for (let i = 0; i < prevProps.devices.length; i++) {
    const prevDevice = prevProps.devices[i];
    const nextDevice = nextProps.devices[i];

    // Compare only properties that would affect the map display
    if (
      prevDevice.latitude !== nextDevice.latitude ||
      prevDevice.longitude !== nextDevice.longitude ||
      prevDevice.deviceId !== nextDevice.deviceId ||
      prevDevice.deviceName !== nextDevice.deviceName
    ) {
      return false;
    }
  }

  // Compare the click handler function reference
  if (prevProps.onDeviceClick !== nextProps.onDeviceClick) {
    return false;
  }

  // If we got here, the props are considered equal
  return true;
}

// Export memoized component with custom equality function to prevent unnecessary re-renders
export const GoogleMap = memo(GoogleMapComponent, areDevicesEqual);
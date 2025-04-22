import React, { useEffect, useRef } from 'react';
import { DeviceWithLatestData } from '@shared/types';

interface GoogleMapProps {
  devices: DeviceWithLatestData[];
  onDeviceClick?: (deviceId: string) => void;
}

declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

export function GoogleMap({ devices, onDeviceClick }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Load Google Maps JavaScript API script
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      window.initMap = initMap;

      return () => {
        document.head.removeChild(script);
        // Clean up the global callback function
        if (window.initMap) {
          // Use a type guard to check if initMap exists before nullifying it
          window.initMap = null as unknown as undefined;
        }
      };
    };

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

    loadGoogleMapsScript();

    // Clean up
    return () => {
      if (markersRef.current) {
        markersRef.current.forEach(marker => {
          marker.setMap(null);
        });
      }
    };
  }, [devices, onDeviceClick]);

  // Update markers when devices change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

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
  }, [devices, onDeviceClick]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }} />
  );
}
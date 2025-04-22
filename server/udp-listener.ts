import dgram from "dgram";
import { storage } from "./storage";
import { Server } from "http";
import { AddressInfo } from "net";
import { log } from "./vite";
import { WindDataPacket, WindDataWithAlert } from "@shared/types";
import axios from "axios";

// Default UDP port
const DEFAULT_UDP_PORT = 8125;

// Function to get human-readable location from coordinates using Google Maps Geocoding API
async function getLocationFromCoordinates(latitude: number, longitude: number): Promise<string | null> {
  try {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      log("Google Maps API key not found", "udp");
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
      // Extract locality (suburb) or neighborhood from results
      const addressComponents = response.data.results[0].address_components;
      
      // Try to find a neighborhood, locality, or administrative area
      for (const component of addressComponents) {
        if (component.types.includes('neighborhood') || component.types.includes('sublocality')) {
          return component.long_name;
        }
      }
      
      for (const component of addressComponents) {
        if (component.types.includes('locality')) {
          return component.long_name;
        }
      }
      
      for (const component of addressComponents) {
        if (component.types.includes('administrative_area_level_2')) {
          return component.long_name;
        }
      }
      
      // Fallback to first result's formatted address, but only take the first part
      const formattedAddress = response.data.results[0].formatted_address;
      const parts = formattedAddress.split(',');
      return parts[0].trim();
    }
    
    return null;
  } catch (error) {
    log(`Error getting location from coordinates: ${error}`, "udp");
    return null;
  }
}

export function setupUdpListener(httpServer: Server) {
  // Create UDP server
  const udpServer = dgram.createSocket("udp4");

  udpServer.on("error", (err) => {
    log(`UDP server error: ${err.message}`, "udp");
    udpServer.close();
  });

  udpServer.on("message", async (msg, rinfo) => {
    try {
      // Parse incoming message
      const data = JSON.parse(msg.toString()) as WindDataPacket;
      
      log(`Received data from ${rinfo.address}:${rinfo.port} - DeviceID: ${data.deviceId}`, "udp");
      
      // Validate required fields
      if (!data.deviceId || !data.timestamp || data.windSpeed === undefined) {
        log(`Invalid data format: Missing required fields`, "udp");
        return;
      }

      // Process GPS coordinates if present
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (data.gps) {
        const [lat, lng] = data.gps.split(",").map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          latitude = lat;
          longitude = lng;
        }
      }

      // Check if device exists in our database
      const device = await storage.getDeviceByDeviceId(data.deviceId);
      if (!device) {
        log(`Device not found: ${data.deviceId}`, "udp");
        return;
      }

      // Update device with latest location if available
      if (latitude !== undefined && longitude !== undefined) {
        const updateData: {
          latitude: number;
          longitude: number;
          lastSeen: Date;
          location?: string;
        } = {
          latitude,
          longitude,
          lastSeen: new Date()
        };
        
        // Only try to get a location name if one isn't already set
        if (!device.location) {
          try {
            const locationName = await getLocationFromCoordinates(latitude, longitude);
            if (locationName) {
              updateData.location = locationName;
              log(`Updated location for device ${data.deviceId} to ${locationName}`, "udp");
            }
          } catch (error) {
            log(`Error getting location name: ${error}`, "udp");
          }
        }
        
        await storage.updateDevice(device.id, updateData);
      } else {
        await storage.updateDevice(device.id, {
          lastSeen: new Date()
        });
      }

      // Get device thresholds
      const thresholds = await storage.getThresholdsByDeviceId(data.deviceId);
      if (!thresholds) {
        log(`No thresholds found for device: ${data.deviceId}`, "udp");
        return;
      }

      // Calculate if alert state based on thresholds
      // Here we're just checking the current reading against max threshold
      // In a real system, you might want to check average over past X minutes
      const alertState = data.windSpeed > thresholds.maxWindSpeedThreshold;

      // Prepare data with alert state
      const windDataWithAlert: WindDataWithAlert = {
        deviceId: data.deviceId,
        timestamp: data.timestamp,
        windSpeed: data.windSpeed,
        latitude,
        longitude,
        alertState
      };

      // Insert wind data into database
      await storage.insertWindData({
        deviceId: windDataWithAlert.deviceId,
        timestamp: new Date(windDataWithAlert.timestamp),
        windSpeed: windDataWithAlert.windSpeed,
        latitude: windDataWithAlert.latitude,
        longitude: windDataWithAlert.longitude,
        alertState: windDataWithAlert.alertState
      });

      log(`Processed wind data for device ${data.deviceId}`, "udp");
    } catch (error) {
      log(`Error processing UDP message: ${error}`, "udp");
    }
  });

  udpServer.on("listening", () => {
    const address = udpServer.address() as AddressInfo;
    log(`UDP server listening on ${address.address}:${address.port}`, "udp");
  });

  // Determine UDP port
  const udpPort = process.env.UDP_PORT ? parseInt(process.env.UDP_PORT) : DEFAULT_UDP_PORT;
  
  // Bind to all interfaces
  udpServer.bind(udpPort, "0.0.0.0");

  // Ensure UDP server is closed when HTTP server closes
  httpServer.on("close", () => {
    udpServer.close();
  });

  return udpServer;
}

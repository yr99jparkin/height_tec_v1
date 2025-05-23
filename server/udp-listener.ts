import dgram from "dgram";
import { storage } from "./storage";
import { Server } from "http";
import { AddressInfo } from "net";
import { log } from "./vite";
import { WindDataPacket, WindDataWithAlert } from "@shared/types";
import axios from "axios";
import { emailService } from "./email-service";

// Default UDP port
const DEFAULT_UDP_PORT = 8125;

// Function to track if we're in a simulated environment
let isSimulatedEnvironment = false;

// Forward declaration of the processWindData function to fix the LSP error
// Export the function to make it available for direct calling from the simulation
export let processWindData: (
  data: WindDataPacket,
  isSimulated?: boolean
) => Promise<{ success: boolean; message?: string; data?: WindDataWithAlert }>;

/**
 * Process wind data from either UDP packets or direct function calls
 * @param data The wind data packet to process
 * @param isSimulated Whether this data is from a simulation (direct function call)
 * @returns Result of the processing operation
 */
processWindData = async function(
  data: WindDataPacket,
  isSimulated: boolean = false
): Promise<{ success: boolean; message?: string; data?: WindDataWithAlert }> {
  try {
    // Set the global flag if this is simulated data
    if (isSimulated) {
      isSimulatedEnvironment = true;
    }
    
    // Log data source
    const source = isSimulated ? "simulation" : "udp";
    log(`Processing wind data for device ${data.deviceId} from ${source}`, "udp");
    
    // Validate required fields
    if (!data.deviceId || !data.timestamp || data.windSpeed === undefined) {
      log(`Invalid data format: Missing required fields`, "udp");
      return { success: false, message: "Invalid data format: Missing required fields" };
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
      return { success: false, message: `Device not found: ${data.deviceId}` };
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
      return { success: false, message: `No thresholds found for device: ${data.deviceId}` };
    }

    // Calculate alert state based on thresholds
    const redThreshold = thresholds.redThreshold || 30;
    const amberThreshold = thresholds.amberThreshold || 20;
    
    // Calculate specific alert states
    const amberAlert = data.windSpeed >= amberThreshold;
    const redAlert = data.windSpeed >= redThreshold;
    
    // Overall alert state is true if either amber or red alert is triggered
    // (this maintains backward compatibility)
    const alertState = amberAlert;

    // Get the previous reading to calculate downtime
    let downtimeSeconds = 0;
    try {
      const previousReading = await storage.getLatestWindDataByDeviceId(data.deviceId);
      
      // Calculate downtime if this is a red alert
      if (redAlert && previousReading) {
        const previousTime = previousReading.timestamp;
        const currentTime = new Date(data.timestamp);
        
        // Calculate time difference in seconds
        const timeDiff = (currentTime.getTime() - previousTime.getTime()) / 1000;
        
        // If previous reading was also in red alert state, add the time difference to downtime
        if (previousReading.redAlert) {
          downtimeSeconds = timeDiff;
          log(`Calculated downtime for device ${data.deviceId}: ${downtimeSeconds} seconds`, "udp");
        }
      }
    } catch (error) {
      log(`Error calculating downtime: ${error}`, "udp");
    }

    // Prepare data with alert states and downtime
    const windDataWithAlert: WindDataWithAlert = {
      deviceId: data.deviceId,
      timestamp: data.timestamp,
      windSpeed: data.windSpeed,
      latitude,
      longitude,
      alertState,
      amberAlert,
      redAlert,
      downtimeSeconds
    };

    // Insert wind data into database
    await storage.insertWindData({
      deviceId: windDataWithAlert.deviceId,
      timestamp: new Date(windDataWithAlert.timestamp),
      windSpeed: windDataWithAlert.windSpeed,
      latitude: windDataWithAlert.latitude,
      longitude: windDataWithAlert.longitude,
      alertState: windDataWithAlert.alertState,
      amberAlert: windDataWithAlert.amberAlert,
      redAlert: windDataWithAlert.redAlert,
      downtimeSeconds: windDataWithAlert.downtimeSeconds,
      processed: false // Mark as not processed for aggregation
    });

    log(`Processed wind data for device ${data.deviceId}`, "udp");
    
    // Process email notifications if alert thresholds are exceeded
    if (amberAlert || redAlert) {
      const alertLevel = redAlert ? "red" : "amber";
      log(`${alertLevel.toUpperCase()} alert triggered for device ${data.deviceId} - Wind speed: ${data.windSpeed}`, "udp");
      
      // Send email notifications asynchronously to avoid delaying the UDP processing
      emailService.processWindAlert({
        deviceId: data.deviceId,
        windSpeed: data.windSpeed,
        alertLevel: alertLevel as "amber" | "red",
        timestamp: new Date(data.timestamp)
      }).catch(error => {
        log(`Error sending alert notifications: ${error}`, "udp");
      });
    }

    return { 
      success: true, 
      message: `Successfully processed wind data for device ${data.deviceId}`,
      data: windDataWithAlert
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error processing wind data: ${errorMessage}`, "udp");
    return { success: false, message: `Error processing wind data: ${errorMessage}` };
  }
}

// Function to get human-readable location from coordinates using Google Maps Geocoding API
async function getLocationFromCoordinates(latitude: number, longitude: number): Promise<string | null> {
  try {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      log("Google Maps API key not found", "udp");
      return null;
    }

    // Add region biasing for Australia to improve results
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&region=au&key=${apiKey}`;
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
      // Log full response for debugging
      log(`Geocoding response for ${latitude},${longitude}: ${JSON.stringify(response.data.results[0].address_components.map((c: any) => ({ name: c.long_name, types: c.types })))}`, "udp");
      
      // First check for Australian results
      const isAustralian = response.data.results.some((result: any) => 
        result.address_components.some((component: any) => 
          component.types.includes('country') && component.short_name === 'AU'
        )
      );
      
      // If not in Australia, we might have a completely wrong result
      if (!isAustralian) {
        log(`Warning: Geocoding result for ${latitude},${longitude} appears to not be in Australia`, "udp");
        
        // Check if coords are in Australia's rough bounding box
        if (latitude >= -43.6 && latitude <= -10.5 && longitude >= 113.0 && longitude <= 154.0) {
          // These should be Australian coordinates, but API is not returning Australia
          // Use more specific regional lookup based on coordinates
          if (latitude >= -38.0 && latitude <= -37.0 && longitude >= 144.0 && longitude <= 146.0) {
            return "Melbourne";
          }
          if (latitude >= -34.0 && latitude <= -33.0 && longitude >= 150.0 && longitude <= 152.0) {
            return "Sydney";
          }
        }
      }
      
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

  // Create a function to process wind data that can be called directly
  udpServer.on("message", async (msg, rinfo) => {
    try {
      // Parse incoming message
      const data = JSON.parse(msg.toString()) as WindDataPacket;
      log(`Received data from ${rinfo.address}:${rinfo.port} - DeviceID: ${data.deviceId}`, "udp");
      
      // Process the data
      await processWindData(data, false); // false = not from simulation
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

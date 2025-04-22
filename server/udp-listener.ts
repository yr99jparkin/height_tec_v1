import dgram from "dgram";
import { storage } from "./storage";
import { Server } from "http";
import { AddressInfo } from "net";
import { log } from "./vite";
import { WindDataPacket, WindDataWithAlert } from "@shared/types";

// Default UDP port
const DEFAULT_UDP_PORT = 8125;

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
        await storage.updateDevice(device.id, {
          latitude,
          longitude,
          lastSeen: new Date()
        });
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

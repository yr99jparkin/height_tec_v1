
import { storage } from "../storage";

async function generateDummyData() {
  const deviceId = "HT-ANEM-002";
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  // Generate data points every 5 minutes
  const interval = 5 * 60 * 1000; // 5 minutes in milliseconds
  let currentTime = twoWeeksAgo;

  while (currentTime <= now) {
    // Generate random wind speed between 5 and 35 km/h
    // With some daily patterns - higher winds during day, lower at night
    const hour = currentTime.getHours();
    const baseSpeed = hour >= 8 && hour <= 18 ? 20 : 10; // Higher during day
    const windSpeed = baseSpeed + (Math.random() * 15 - 7.5); // Add variation

    // Fixed location for the device
    const latitude = -33.8688;
    const longitude = 151.2093;

    // Determine alert state based on thresholds
    const alertState = windSpeed > 30.0; // Using default max threshold

    await storage.insertWindData({
      deviceId,
      timestamp: new Date(currentTime),
      windSpeed,
      latitude,
      longitude,
      alertState
    });

    currentTime = new Date(currentTime.getTime() + interval);
  }

  console.log("Dummy data generation completed");
}

generateDummyData().catch(console.error);

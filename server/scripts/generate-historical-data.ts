
import { db } from "../db";
import { windDataHistorical } from "@shared/schema";
import { addMinutes } from "date-fns";

// Generate realistic looking wind speeds with some variability
function generateWindSpeed(baseSpeed: number, variance: number): number {
  return Math.max(0, baseSpeed + (Math.random() * variance * 2) - variance);
}

async function generateHistoricalData() {
  const deviceId = "HT-ANEM-002";
  const startDate = new Date("2025-04-01T00:00:00Z");
  const totalIntervals = 8064; // 4 weeks worth of 10-minute intervals

  console.log("Starting historical data generation...");

  let accumulatedDowntime = 0;
  let isInDowntimeState = false;

  for (let i = 0; i < totalIntervals; i++) {
    const intervalStart = addMinutes(startDate, i * 10);
    const intervalEnd = addMinutes(intervalStart, 10);
    
    // Base wind speed varies throughout the day
    const hour = intervalStart.getHours();
    let baseSpeed = 15;
    
    // Higher winds during day, with occasional extreme conditions
    if (hour >= 9 && hour <= 17) {
      baseSpeed = 25; // Higher during day
      // 10% chance of extreme conditions during day
      if (Math.random() < 0.1) {
        baseSpeed = 35;
      }
    } else if (hour >= 22 || hour <= 5) {
      baseSpeed = 10; // Lower at night
    }
    
    const avgWindSpeed = generateWindSpeed(baseSpeed, 5);
    const maxWindSpeed = avgWindSpeed + generateWindSpeed(5, 3);
    const stdDeviation = Math.abs(maxWindSpeed - avgWindSpeed) / 2;
    
    const amberThreshold = 20;
    const redThreshold = 30;
    
    const alertTriggered = avgWindSpeed >= amberThreshold;
    const amberAlertTriggered = avgWindSpeed >= amberThreshold && avgWindSpeed < redThreshold;
    const redAlertTriggered = avgWindSpeed >= redThreshold;

    // Downtime calculation logic
    let downtimeSeconds = 0;
    
    // If wind speed is above red threshold, high chance of starting downtime
    if (redAlertTriggered && !isInDowntimeState && Math.random() < 0.7) {
      isInDowntimeState = true;
    }
    
    // If in downtime state, accumulate downtime
    if (isInDowntimeState) {
      downtimeSeconds = 600; // 10 minutes in seconds
      accumulatedDowntime += downtimeSeconds;
      
      // 30% chance of ending downtime state if wind speed drops below red threshold
      if (!redAlertTriggered && Math.random() < 0.3) {
        isInDowntimeState = false;
      }
    }

    try {
      await db.insert(windDataHistorical).values({
        deviceId,
        intervalStart,
        intervalEnd,
        avgWindSpeed,
        maxWindSpeed,
        stdDeviation,
        alertTriggered,
        amberAlertTriggered,
        redAlertTriggered,
        downtimeSeconds,
        sampleCount: 60
      });

      if (i % 100 === 0) {
        console.log(`Generated ${i} records...`);
        console.log(`Current accumulated downtime: ${accumulatedDowntime / 3600} hours`);
      }
    } catch (error) {
      console.error("Error inserting data:", error);
    }
  }

  console.log(`Historical data generation complete!`);
  console.log(`Total downtime generated: ${accumulatedDowntime / 3600} hours`);
  process.exit(0);
}

generateHistoricalData().catch(error => {
  console.error("Failed to generate historical data:", error);
  process.exit(1);
});

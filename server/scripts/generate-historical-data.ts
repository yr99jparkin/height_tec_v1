
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
  const totalIntervals = 4032; // 4 weeks worth of 10-minute intervals

  console.log("Starting historical data generation...");

  for (let i = 0; i < totalIntervals; i++) {
    const intervalStart = addMinutes(startDate, i * 10);
    const intervalEnd = addMinutes(intervalStart, 10);
    
    // Base wind speed varies throughout the day
    const hour = intervalStart.getHours();
    let baseSpeed = 15;
    
    if (hour >= 9 && hour <= 17) {
      baseSpeed = 25; // Higher during day
    } else if (hour >= 22 || hour <= 5) {
      baseSpeed = 10; // Lower at night
    }
    
    const avgWindSpeed = generateWindSpeed(baseSpeed, 5);
    const maxWindSpeed = avgWindSpeed + generateWindSpeed(5, 3);
    const stdDeviation = Math.abs(maxWindSpeed - avgWindSpeed) / 2;
    
    const amberThreshold = 20;
    const redThreshold = 30;
    
    const alertTriggered = avgWindSpeed >= amberThreshold;
    const amberAlertTriggered = avgWindSpeed >= amberThreshold;
    const redAlertTriggered = avgWindSpeed >= redThreshold;
    const downtimeSeconds = redAlertTriggered ? 600 : 0;

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
      }
    } catch (error) {
      console.error("Error inserting data:", error);
    }
  }

  console.log("Historical data generation complete!");
  process.exit(0);
}

generateHistoricalData().catch(error => {
  console.error("Failed to generate historical data:", error);
  process.exit(1);
});

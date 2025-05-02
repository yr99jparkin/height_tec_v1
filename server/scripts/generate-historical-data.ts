
import { storage } from "../storage";
import { InsertWindDataHistorical } from "@shared/schema";

async function generateHistoricalData() {
  const devices = ["HT-ANEM-001", "HT-ANEM-002", "HT-ANEM-003"];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Generate data in 10-minute intervals
  const intervalMinutes = 10;
  
  for (const deviceId of devices) {
    let currentTime = new Date(sevenDaysAgo);
    
    while (currentTime < now) {
      const intervalEnd = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
      
      // Generate realistic wind patterns
      // Base wind speed varies by time of day (higher during afternoon)
      const hour = currentTime.getHours();
      const baseWindSpeed = 8 + Math.sin((hour - 6) * Math.PI / 12) * 5; // Peak at 6pm
      
      // Add random variation
      const avgWindSpeed = baseWindSpeed + (Math.random() * 4 - 2);
      const maxWindSpeed = avgWindSpeed + (Math.random() * 5 + 2);
      const stdDeviation = Math.random() * 2 + 1;
      
      // Determine if alerts were triggered
      const amberAlertTriggered = maxWindSpeed >= 20;
      const redAlertTriggered = maxWindSpeed >= 30;
      const alertTriggered = amberAlertTriggered || redAlertTriggered;
      
      // Calculate downtime if red alert was triggered
      const downtimeSeconds = redAlertTriggered ? intervalMinutes * 60 : 0;
      
      const historicalData: InsertWindDataHistorical = {
        deviceId,
        intervalStart: currentTime,
        intervalEnd,
        avgWindSpeed,
        maxWindSpeed,
        stdDeviation,
        alertTriggered,
        amberAlertTriggered,
        redAlertTriggered,
        downtimeSeconds,
        sampleCount: Math.floor(Math.random() * 5 + 25) // 25-30 samples per 10min
      };
      
      await storage.insertWindDataHistorical(historicalData);
      
      // Move to next interval
      currentTime = intervalEnd;
    }
    
    console.log(`Generated historical data for device ${deviceId}`);
  }
  
  console.log("Historical data generation complete");
}

generateHistoricalData().catch(console.error);

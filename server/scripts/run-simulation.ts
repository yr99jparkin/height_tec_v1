import { WindDataPacket } from '@shared/types';
import { processWindData } from '../udp-listener';
import { log } from '../vite';

/**
 * Directly injects data into the wind data processing system without using UDP
 * @param params Simulation parameters
 * @returns Result of the simulation
 */
export async function runSimulation(params: {
  deviceId?: string;
  windSpeed?: number;
  count?: number;
  delayMs?: number;
  gpsCoordinates?: string;
}) {
  // Extract parameters with defaults
  const {
    deviceId = "HT-ANEM-001",
    windSpeed = 35,
    count = 5,
    delayMs = 1000,
    gpsCoordinates = "-33.8688,151.2093" // Sydney coordinates by default
  } = params;

  log(`[simulation] Starting direct wind data simulation for device ${deviceId} with wind speed ${windSpeed}`, "simulation");
  
  // Track results
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  // Send multiple data points with a delay between each
  for (let i = 0; i < count; i++) {
    try {
      // Create wind data packet
      const data: WindDataPacket = {
        deviceId,
        timestamp: new Date().toISOString(),
        windSpeed,
        gps: gpsCoordinates
      };

      log(`[simulation] Processing simulated wind data (${i+1}/${count}): ${JSON.stringify(data)}`, "simulation");
      
      // Process the data directly through the function (true = is simulated)
      const result = await processWindData(data, true);
      
      // Track success/failure
      if (result.success) {
        successCount++;
        log(`[simulation] Successfully processed data point ${i+1}/${count}`, "simulation");
      } else {
        errorCount++;
        log(`[simulation] Failed to process data point ${i+1}/${count}: ${result.message}`, "simulation");
      }
      
      results.push(result);
      
      // Add delay between data points if more to send
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[simulation] Error during simulation: ${errorMessage}`, "simulation");
      errorCount++;
      results.push({
        success: false,
        message: `Error: ${errorMessage}`
      });
    }
  }

  // Return summary
  return {
    success: errorCount === 0,
    processed: count,
    successful: successCount,
    failed: errorCount,
    results,
    message: `Wind data simulation completed: ${successCount} successful, ${errorCount} failed`
  };
}
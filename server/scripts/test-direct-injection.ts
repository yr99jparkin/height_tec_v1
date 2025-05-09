import { processWindData } from '../udp-listener';
import { log } from '../vite';

/**
 * Test script for direct injection of wind data
 * Run this with: npx tsx server/scripts/test-direct-injection.ts
 */
async function testDirectInjection() {
  // Sample device data
  const data = {
    deviceId: 'HT-ANEM-001',
    timestamp: new Date().toISOString(),
    windSpeed: 40,
    gps: '-33.8688,151.2093'
  };
  
  console.log('Testing direct injection with data:', data);
  
  try {
    // Process the data directly through the function (true = is simulated)
    const result = await processWindData(data, true);
    console.log('Result of direct injection:', result);
  } catch (error) {
    console.error('Error during direct injection test:', error);
  }
}

// Run the test
testDirectInjection().catch(error => {
  console.error('Unhandled error:', error);
});
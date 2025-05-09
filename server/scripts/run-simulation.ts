import { spawn } from 'child_process';
import path from 'path';

// Function to run the simulation script with optional parameters
export function runSimulation(params: {
  serverHost?: string;
  udpPort?: number;
  deviceId?: string;
  windSpeed?: number;
}) {
  const { serverHost, udpPort, deviceId, windSpeed } = params;

  // Set environment variables for the script
  const env = { ...process.env };
  if (serverHost) env.SERVER_HOST = serverHost;
  if (udpPort) env.UDP_PORT = udpPort.toString();
  if (deviceId) env.DEVICE_ID = deviceId;
  if (windSpeed !== undefined) env.WIND_SPEED = windSpeed.toString();

  // Use localhost when in development mode
  if (!env.SERVER_HOST) {
    env.SERVER_HOST = "0.0.0.0";  // Use 0.0.0.0 instead of localhost for better accessibility
  }

  // Ensure UDP port is set
  if (!env.UDP_PORT) {
    env.UDP_PORT = "8125";
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const scriptPath = path.resolve(__dirname, 'simulate-production-data.ts');

  console.log(`[simulation] Environment variables: ${JSON.stringify({
    SERVER_HOST: env.SERVER_HOST,
    UDP_PORT: env.UDP_PORT,
    DEVICE_ID: env.DEVICE_ID,
    WIND_SPEED: env.WIND_SPEED
  })}`);

  // Use tsx to run the TypeScript script
  const args = [scriptPath];

  console.log(`[simulation] Running simulation with: ${JSON.stringify({
    serverHost: env.SERVER_HOST,
    udpPort: env.UDP_PORT,
    deviceId: env.DEVICE_ID,
    windSpeed: env.WIND_SPEED
  })}`);

  // Run the script without waiting for it to complete
  const child = spawn('tsx', args, {
    env,
    stdio: 'pipe', // Capture output
    detached: true // Run in the background
  });

  // Log output without blocking
  child.stdout.on('data', (data) => {
    console.log(`[simulation] ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`[simulation-error] ${data.toString().trim()}`);
  });

  // Don't wait for the child to exit
  child.unref();

  return {
    success: true,
    count: 5, // We know the script sends 5 data points
    message: 'Simulation started in the background'
  };
}
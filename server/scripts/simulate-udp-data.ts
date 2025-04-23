
import dgram from "dgram";

const client = dgram.createSocket("udp4");

const devices = [
  {
    deviceId: "HT-ANEM-002",
    location: { lat: -33.8688, lng: 151.2093 }, // Sydney
    currentSpeed: 15 // Initial speed
  },
  {
    deviceId: "HT-ANEM-001",
    location: { lat: 53.8013, lng: -1.5491 }, // Leeds
    currentSpeed: 12 // Initial speed
  },
  {
    deviceId: "HT-ANEM-004",
    location: { lat: -28.5414, lng: 153.5478 }, // Bruns
    currentSpeed: 18 // Initial speed
  }
];

// Generate next wind speed value with smoother transitions
function getNextWindSpeed(currentSpeed: number): number {
  // Small random change (-1 to 1)
  const smallChange = (Math.random() * 2 - 1) * 0.5;
  
  // Occasional larger change (30% chance)
  const largeChange = Math.random() < 0.3 ? (Math.random() * 10 - 5) : 0;
  
  // Combine changes and ensure within bounds
  let newSpeed = currentSpeed + smallChange + largeChange;
  
  // Keep within reasonable bounds (0-65 km/h)
  newSpeed = Math.max(0, Math.min(65, newSpeed));
  
  return newSpeed;
}

function sendWindData() {
  devices.forEach(device => {
    // Update the device's wind speed
    device.currentSpeed = getNextWindSpeed(device.currentSpeed);

    const data = {
      deviceId: device.deviceId,
      timestamp: new Date().toISOString(),
      windSpeed: device.currentSpeed,
      gps: `${device.location.lat},${device.location.lng}`
    };

    const message = Buffer.from(JSON.stringify(data));
    client.send(message, 8125, "0.0.0.0", (err) => {
      if (err) {
        console.error(`Failed to send data for ${device.deviceId}:`, err);
        return;
      }
      console.log(`Sent wind data for ${device.deviceId}:`, data);
    });
  });
}

// Send data every 5 seconds
const interval = setInterval(sendWindData, 5000);
sendWindData(); // Send first data immediately

// Handle errors
client.on("error", (err) => {
  console.error("UDP client error:", err);
  clearInterval(interval);
  client.close();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\nGracefully shutting down...");
  clearInterval(interval);
  client.close(() => {
    console.log("UDP client closed");
    process.exit(0);
  });
});

// Optional: Stop after specific duration (e.g., 1 hour)
const duration = 60 * 60 * 1000; // 1 hour in milliseconds
setTimeout(() => {
  console.log("Simulation complete");
  clearInterval(interval);
  client.close(() => {
    process.exit(0);
  });
}, duration);

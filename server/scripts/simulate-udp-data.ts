
import dgram from "dgram";

const client = dgram.createSocket("udp4");

const devices = [
  {
    deviceId: "HT-ANEM-002",
    location: { lat: -33.8688, lng: 151.2093 } // Sydney
  },
  {
    deviceId: "HT-ANEM-003",
    location: { lat: -37.8136, lng: 144.9631 } // Melbourne
  }
];

function sendWindData() {
  devices.forEach(device => {
    const data = {
      deviceId: device.deviceId,
      timestamp: new Date().toISOString(),
      windSpeed: Math.random() * 35, // Random speed between 0-35 km/h
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

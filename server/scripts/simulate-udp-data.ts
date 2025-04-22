
import dgram from "dgram";

const client = dgram.createSocket("udp4");

function sendWindData() {
  const data = {
    deviceId: "HT-ANEM-002",
    timestamp: new Date().toISOString(),
    windSpeed: Math.random() * 35, // Random speed between 0-35 km/h
    gps: "-33.8688,151.2093" // Sydney coordinates
  };

  const message = Buffer.from(JSON.stringify(data));
  client.send(message, 8125, "0.0.0.0", (err) => {
    if (err) {
      console.error("Failed to send data:", err);
      return;
    }
    console.log("Sent wind data:", data);
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

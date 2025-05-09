
import dgram from "dgram";

const client = dgram.createSocket("udp4");

// Get environment variables with production defaults
const isProduction = process.env.NODE_ENV === "production";
// In production, send to heighttec.app by default
const SERVER_HOST = process.env.SERVER_HOST || (isProduction ? "heighttec.app" : "0.0.0.0");
const UDP_PORT = parseInt(process.env.UDP_PORT || "8125");
const DEVICE_ID = process.env.DEVICE_ID || "HT-ANEM-001";
let WIND_SPEED = 35; // Default value
if (process.env.WIND_SPEED) {
  WIND_SPEED = parseInt(process.env.WIND_SPEED);
  if (isNaN(WIND_SPEED)) {
    WIND_SPEED = 35; // Fallback if parsing fails
    console.warn(`Invalid WIND_SPEED value: ${process.env.WIND_SPEED}, using default 35`);
  }
}

console.log(`Sending data to ${SERVER_HOST}:${UDP_PORT} for device ${DEVICE_ID} with wind speed ${WIND_SPEED}`);

async function sendPackets() {
  const device = {
    deviceId: DEVICE_ID,
    location: { lat: -33.8688, lng: 151.2093 } // Sydney coordinates
  };

  // Send 5 packets with 1 second delay between each
  for (let i = 0; i < 5; i++) {
    const data = {
      deviceId: device.deviceId,
      timestamp: new Date().toISOString(),
      windSpeed: WIND_SPEED,
      gps: `${device.location.lat},${device.location.lng}`
    };

    const message = Buffer.from(JSON.stringify(data));
    
    await new Promise<void>((resolve) => {
      client.send(message, UDP_PORT, SERVER_HOST, (err) => {
        if (err) {
          console.error(`Failed to send data to ${SERVER_HOST}:${UDP_PORT}:`, err);
        } else {
          console.log(`Sent wind data to ${SERVER_HOST}:${UDP_PORT}:`, data);
        }
        resolve();
      });
    });

    // Wait 1 second before sending next packet
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  client.close();
  console.log("Finished sending packets");
  process.exit(0);
}

sendPackets().catch(error => {
  console.error("Failed to send packets:", error);
  process.exit(1);
});


import dgram from "dgram";

const client = dgram.createSocket("udp4");

async function sendPackets() {
  const device = {
    deviceId: "HT-ANEM-001",
    location: { lat: -33.8688, lng: 151.2093 } // Sydney coordinates
  };

  // Send 5 packets with 1 second delay between each
  for (let i = 0; i < 5; i++) {
    const data = {
      deviceId: device.deviceId,
      timestamp: new Date().toISOString(),
      windSpeed: 35,
      gps: `${device.location.lat},${device.location.lng}`
    };

    const message = Buffer.from(JSON.stringify(data));
    
    await new Promise((resolve) => {
      client.send(message, 8125, "0.0.0.0", (err) => {
        if (err) {
          console.error(`Failed to send data:`, err);
        } else {
          console.log(`Sent wind data:`, data);
        }
        resolve(null);
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

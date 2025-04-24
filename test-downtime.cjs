/**
 * Test script to simulate device downtime by sending red alert data via UDP
 * Usage: node test-downtime.cjs [device-id] [start|stop]
 */

const dgram = require('dgram');
const client = dgram.createSocket('udp4');

// Configuration
const UDP_PORT = 8125;
const UDP_HOST = 'localhost';

// Default device if not specified
const DEFAULT_DEVICE_ID = 'HT-ANEM-002';

// Get command line arguments
const args = process.argv.slice(2);
const deviceId = args[0] || DEFAULT_DEVICE_ID;
const action = args[1] || 'start'; // default to starting downtime (red alert)

// Wind speeds to send
const RED_ALERT_WIND_SPEED = 35; // Above red threshold (30)
const NORMAL_WIND_SPEED = 15;    // Below amber threshold (20)

// Create the data packet
const timestamp = new Date().toISOString();
const windSpeed = action.toLowerCase() === 'start' ? RED_ALERT_WIND_SPEED : NORMAL_WIND_SPEED;

const packet = {
  deviceId,
  timestamp,
  windSpeed,
  gps: '51.5072,0.1276' // London coordinates as example
};

console.log(`Sending ${action} command for device ${deviceId} with wind speed ${windSpeed} km/h`);
console.log('Data:', packet);

// Convert to JSON and send
const message = Buffer.from(JSON.stringify(packet));
client.send(message, 0, message.length, UDP_PORT, UDP_HOST, (err) => {
  if (err) {
    console.error('Error sending message:', err);
  } else {
    console.log('Message sent successfully');
    
    // Adding some delay to make sure the message is processed
    setTimeout(() => {
      client.close();
    }, 500);
  }
});
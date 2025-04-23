const dgram = require('dgram');
const client = dgram.createSocket('udp4');

// Create a specific test case with a known wind speed
const testDataAmber = {
  deviceId: 'HT-ANEM-004',
  timestamp: new Date().toISOString(),
  windSpeed: 19,  // Above amber (16) but below red (50)
  gps: '-28.5414,153.5478'
};

const testDataRed = {
  deviceId: 'HT-ANEM-004',
  timestamp: new Date().toISOString(),
  windSpeed: 52,  // Above red threshold (50)
  gps: '-28.5414,153.5478'
};

// Send the message
client.send(JSON.stringify(testDataAmber), 8125, '127.0.0.1', (err) => {
  if (err) {
    console.error('Error sending UDP data:', err);
  } else {
    console.log('Sent amber test data:', testDataAmber);
  }
  
  // Wait a moment before sending the red alert test
  setTimeout(() => {
    client.send(JSON.stringify(testDataRed), 8125, '127.0.0.1', (err) => {
      if (err) {
        console.error('Error sending UDP data:', err);
      } else {
        console.log('Sent red test data:', testDataRed);
      }
      client.close();
    });
  }, 1000);
});

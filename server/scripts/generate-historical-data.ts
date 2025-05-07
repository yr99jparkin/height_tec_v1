const deviceId = "HT-ANEM-002"; // Using one of our test devices
const startDate = new Date("2025-04-01T00:00:00Z");
const totalIntervals = 4032; // 4 weeks worth of 10-minute intervals

//  Add necessary imports here if needed.  Example:
// import { generateData } from './data-generator';


// Function to generate a single data point
function generateDataPoint(timestamp: Date): any {
  // Replace this with your actual data generation logic.
  // This example generates random values for temperature and humidity.
  const temperature = Math.random() * 20 + 15; // Temperature between 15 and 35
  const humidity = Math.random() * 30 + 60;     // Humidity between 60 and 90
  return {
    deviceId: deviceId,
    timestamp: timestamp.toISOString(),
    temperature: temperature,
    humidity: humidity,
    // Add other relevant fields here
  };
}

// Function to generate historical data
async function generateHistoricalData(deviceId: string, startDate: Date, totalIntervals: number): Promise<any[]> {
  const intervalMinutes = 10; // 10-minute intervals
  const intervalMs = intervalMinutes * 60 * 1000;
  const dataPoints: any[] = [];

  for (let i = 0; i < totalIntervals; i++) {
    const timestamp = new Date(startDate.getTime() + i * intervalMs);
    const dataPoint = generateDataPoint(timestamp);
    dataPoints.push(dataPoint);
  }
  return dataPoints;
}


// Main function to execute data generation
async function main() {
  try {
    const historicalData = await generateHistoricalData(deviceId, startDate, totalIntervals);
    console.log("Generated Data:", historicalData);
    // Add your logic to save or process the generated data here.
    // Example: saving to a file or database.

  } catch (error) {
    console.error("Error generating historical data:", error);
  }
}


main();
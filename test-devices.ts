import { db } from './server/db';
import { devices } from './shared/schema';

async function main() {
  try {
    console.log('Fetching devices...');
    const allDevices = await db.select().from(devices);
    console.log('Devices:', JSON.stringify(allDevices, null, 2));
  } catch (error) {
    console.error('Error fetching devices:', error);
  } finally {
    process.exit(0);
  }
}

main();
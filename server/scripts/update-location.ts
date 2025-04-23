import { storage } from "../storage";
import { log } from "../vite";

async function updateDeviceLocation() {
  try {
    // Get the device with id HT-ANEM-003
    const device = await storage.getDeviceByDeviceId("HT-ANEM-003");
    
    if (!device) {
      console.error("Device HT-ANEM-003 not found");
      process.exit(1);
    }
    
    // Update the location to Melbourne
    await storage.updateDevice(device.id, {
      location: "Melbourne"
    });
    
    console.log(`Updated device ${device.deviceId} location to Melbourne`);
    
    // Verify the update
    const updatedDevice = await storage.getDeviceByDeviceId("HT-ANEM-003");
    console.log("Updated device:", updatedDevice);
    
    process.exit(0);
  } catch (error) {
    console.error("Error updating device location:", error);
    process.exit(1);
  }
}

updateDeviceLocation();
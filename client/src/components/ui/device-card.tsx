import { DeviceWithLatestData } from "@shared/types";
import { Card } from "./card";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface DeviceCardProps {
  device: DeviceWithLatestData;
  onDeviceClick: (deviceId: string) => void;
}

export function DeviceCard({ device, onDeviceClick }: DeviceCardProps) {
  // Determine alert status based on wind speeds
  const getAlertState = () => {
    if (device.alertState || device.maxWindSpeed > 30) {
      return "danger";
    }
    if (device.avgWindSpeed > 18 || device.maxWindSpeed > 23) {
      return "warning";
    }
    return "safe";
  };
  
  const alertState = getAlertState();

  // Format last updated time
  const getLastUpdatedText = () => {
    if (!device.lastSeen) return "No data yet";
    try {
      return `Updated ${formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}`;
    } catch (error) {
      return "Unknown update time";
    }
  };

  return (
    <Card 
      className={`hover:shadow-md transition-shadow duration-200 border-l-4 border-status-${alertState} cursor-pointer`}
      onClick={() => onDeviceClick(device.deviceId)}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{device.deviceName}</h3>
            <p className="text-neutral-500 text-sm">ID: {device.deviceId}</p>
          </div>
          {device.location && (
            <div className="bg-neutral-100 px-2 py-1 rounded text-xs font-medium text-neutral-600">
              <i className="fas fa-map-marker-alt mr-1"></i> {device.location}
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase font-medium text-neutral-500">Avg. Wind Speed (10m)</p>
            <p className={`wind-status-${alertState} text-xl font-mono font-medium mt-1`}>
              {device.avgWindSpeed.toFixed(1)} <span className="text-sm">km/h</span>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase font-medium text-neutral-500">Max Wind Speed (10m)</p>
            <p className={`wind-status-${alertState} text-xl font-mono font-medium mt-1`}>
              {device.maxWindSpeed.toFixed(1)} <span className="text-sm">km/h</span>
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-neutral-500">
          <i className="far fa-clock mr-1"></i>
          <span>{getLastUpdatedText()}</span>
        </div>
      </div>
    </Card>
  );
}

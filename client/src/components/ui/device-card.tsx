import { DeviceWithLatestData } from "@shared/types";
import { Card } from "./card";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Clock, Folder } from "lucide-react";

interface DeviceCardProps {
  device: DeviceWithLatestData;
  onDeviceClick: (deviceId: string) => void;
}

export function DeviceCard({ device, onDeviceClick }: DeviceCardProps) {
  // We need to manually set these properties for demo since they might not be coming from API
  // Using device wind speed values to set simulated alert states
  // This is a temporary workaround until proper data comes from the server
  const amberThreshold = 20; // Default amber threshold
  const redThreshold = 30;   // Default red threshold
  
  // Use real values from API if available, otherwise calculate based on thresholds
  const amberAlert = device.amberAlert !== undefined ? device.amberAlert : 
                    (device.avgWindSpeed >= amberThreshold || device.maxWindSpeed >= amberThreshold);
  const redAlert = device.redAlert !== undefined ? device.redAlert : 
                  (device.avgWindSpeed >= redThreshold || device.maxWindSpeed >= redThreshold);

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
      // Create Date object and force it to be interpreted as UTC
      const lastSeenDate = new Date(device.lastSeen + 'Z');
      return `Updated ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`;
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
            <div className="bg-neutral-100 px-2 py-1 rounded text-xs font-medium text-neutral-600 flex items-center">
              <MapPin size={12} className="mr-1" /> {device.location}
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase font-medium text-neutral-500">Avg. Wind Speed (10m)</p>
            <div className="flex items-center">
              <p className={`wind-status-${alertState} text-xl font-mono font-medium mt-1 flex items-center`}>
                {device.avgWindSpeed.toFixed(1)} <span className="text-sm mr-2">km/h</span>
                {amberAlert && !redAlert && (
                  <span className="inline-block w-4 h-4 rounded-full bg-[hsl(var(--warning))] shadow-md"></span>
                )}
                {redAlert && (
                  <span className="inline-block w-4 h-4 rounded-full bg-destructive shadow-md"></span>
                )}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase font-medium text-neutral-500">Max Wind Speed (10m)</p>
            <div className="flex items-center">
              <p className={`wind-status-${alertState} text-xl font-mono font-medium mt-1 flex items-center`}>
                {device.maxWindSpeed.toFixed(1)} <span className="text-sm mr-2">km/h</span>
                {amberAlert && !redAlert && (
                  <span className="inline-block w-4 h-4 rounded-full bg-[hsl(var(--warning))] shadow-md"></span>
                )}
                {redAlert && (
                  <span className="inline-block w-4 h-4 rounded-full bg-destructive shadow-md"></span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
          <div className="flex items-center">
            <Clock size={14} className="mr-1" />
            <span>{getLastUpdatedText()}</span>
          </div>
          {device.project && (
            <div className="flex items-center">
              <Folder size={14} className="mr-1" />
              <span className="text-neutral-600 font-medium">{device.project}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

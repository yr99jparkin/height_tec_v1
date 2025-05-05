export interface WindDataPacket {
  deviceId: string;
  timestamp: string;
  windSpeed: number; // Wind speed in meters per second (m/s)
  gps?: string;
}

export interface WindDataWithAlert {
  deviceId: string;
  timestamp: string;
  windSpeed: number; // Wind speed in meters per second (m/s)
  latitude?: number;
  longitude?: number;
  alertState: boolean;
  amberAlert: boolean;
  redAlert: boolean;
  downtimeSeconds?: number;
}

export interface WindSpeedWithTimestamp {
  timestamp: string;
  windSpeed: number; // Wind speed in meters per second (m/s)
}

export interface DeviceWithLatestData {
  id: number;
  deviceId: string;
  deviceName: string;
  project?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  active: boolean;
  lastSeen?: string;
  avgWindSpeed: number; // Wind speed in meters per second (m/s)
  maxWindSpeed: number; // Wind speed in meters per second (m/s)
  alertState: boolean;
}

export interface WindStatsResponse {
  avgWindSpeed: number; // Wind speed in meters per second (m/s)
  maxWindSpeed: number; // Wind speed in meters per second (m/s)
  currentWindSpeed: number; // Wind speed in meters per second (m/s)
  alertState: boolean;
  timestamp: string;
}

export type TimeRangeOption = "15m" | "1h" | "3h" | "24h" | "7d" | "30d" | "custom";

export interface ExportDataParams {
  deviceId: string;
  startDate: string;
  endDate: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AddDeviceRequest {
  deviceId: string;
  deviceName: string;
  project?: string;
}

export interface UpdateThresholdsRequest {
  amberThreshold: number; // Wind speed threshold in meters per second (m/s)
  redThreshold: number; // Wind speed threshold in meters per second (m/s)
}

export interface NotificationContactRequest {
  email: string;
  phoneNumber: string;
}

export interface UpdateDeviceRequest {
  deviceName?: string;
  project?: string;
}

export interface UpdateSpeedUnitRequest {
  speedUnit: string;
}

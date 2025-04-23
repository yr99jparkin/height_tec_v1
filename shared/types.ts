export interface WindDataPacket {
  deviceId: string;
  timestamp: string;
  windSpeed: number;
  gps?: string;
}

export interface WindDataWithAlert {
  deviceId: string;
  timestamp: string;
  windSpeed: number;
  latitude?: number;
  longitude?: number;
  alertState: boolean; // For backward compatibility
  amberAlert: boolean;
  redAlert: boolean;
}

export interface WindSpeedWithTimestamp {
  timestamp: string;
  windSpeed: number;
}

export interface DeviceWithLatestData {
  id: number;
  deviceId: string;
  deviceName: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  active: boolean;
  lastSeen?: string;
  avgWindSpeed: number;
  maxWindSpeed: number;
  alertState: boolean; // For backward compatibility
  amberAlert: boolean;
  redAlert: boolean;
}

export interface WindStatsResponse {
  avgWindSpeed: number;
  maxWindSpeed: number;
  currentWindSpeed: number;
  alertState: boolean; // For backward compatibility
  amberAlert: boolean;
  redAlert: boolean;
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
}

export interface UpdateThresholdsRequest {
  amberThreshold: number;
  redThreshold: number;
}

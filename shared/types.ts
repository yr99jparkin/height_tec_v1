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
  alertState: boolean;
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
  project?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  active: boolean;
  lastSeen?: string;
  avgWindSpeed: number;
  maxWindSpeed: number;
  alertState: boolean;
}

export interface WindStatsResponse {
  avgWindSpeed: number;
  maxWindSpeed: number;
  currentWindSpeed: number;
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
  amberThreshold: number;
  redThreshold: number;
}

// ======= New Downtime Types =======

export interface DowntimeStats {
  total: number;        // Total downtime in seconds
  hours: number;        // Downtime in hours (floating point)
  formatted: string;    // Formatted string (e.g., "2d 4h 35m 12s")
}

export interface DeviceDowntimeStats extends DowntimeStats {
  deviceId: string;
  deviceName: string;
}

export interface ProjectDowntimeStats extends DowntimeStats {
  project: string;
  deviceCount: number;
}

export interface DowntimeResponse {
  devices: DeviceDowntimeStats[];
  projects: ProjectDowntimeStats[];
  timeframe: {
    start: string;
    end: string;
  };
}

export interface DowntimeParams {
  startDate: string;
  endDate: string;
  deviceId?: string;
  project?: string;
}

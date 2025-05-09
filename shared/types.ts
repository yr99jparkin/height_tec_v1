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
  downtimeSeconds?: number;
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

export interface NotificationContactRequest {
  email: string;
  phoneNumber: string;
}

export interface UpdateDeviceRequest {
  deviceName?: string;
  project?: string;
}

// Email notification types
export interface EmailNotificationRequest {
  deviceId: string;
  windSpeed: number;
  alertLevel: "amber" | "red";
  timestamp: string;
  notificationContactId: number;
}

export interface NotificationTokenInfo {
  id: string;
  deviceId: string;
  notificationContactId: number;
  action: "snooze_3h" | "snooze_today";
  expiresAt: string;
}

export interface NotificationAcknowledgement {
  tokenId: string;
  action: "snooze_3h" | "snooze_today";
}

export interface NotificationSnoozeInfo {
  deviceId: string;
  notificationContactId: number;
  snoozedUntil: string;
}

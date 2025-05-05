/**
 * Utility functions for wind speed unit conversion and formatting
 */

// Conversion factors
const MPS_TO_KMH = 3.6; // 1 m/s = 3.6 km/h

/**
 * Convert wind speed from m/s to km/h
 */
export function mpsToKmh(speedMps: number): number {
  return speedMps * MPS_TO_KMH;
}

/**
 * Convert wind speed from km/h to m/s
 */
export function kmhToMps(speedKmh: number): number {
  return speedKmh / MPS_TO_KMH;
}

/**
 * Format and convert wind speed based on user preference
 * @param speed The wind speed in m/s (base unit)
 * @param unit The user's preferred unit ('m/s' or 'km/h')
 * @param decimals Number of decimal places to display
 */
export function formatWindSpeed(speed: number, unit: string = 'm/s', decimals: number = 1): string {
  if (!speed && speed !== 0) return '0.0';
  
  const value = unit === 'km/h' ? mpsToKmh(speed) : speed;
  return value.toFixed(decimals);
}

/**
 * Get display text for wind speed unit
 */
export function getWindSpeedUnitDisplay(unit: string): string {
  return unit === 'm/s' ? 'm/s' : 'km/h';
}
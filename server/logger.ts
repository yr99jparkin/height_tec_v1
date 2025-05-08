/**
 * Simple logging utility
 */
export function log(message: string, category: string = 'general') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [${category}] ${message}`);
}
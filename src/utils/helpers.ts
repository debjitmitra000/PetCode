// Small utility helpers — imported and used in Pet.ts

// Clamp a number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Get current hour (0–23)
export function getCurrentHour(): number {
  return new Date().getHours();
}

// Check if current time is within a given hour range.
// Handles midnight wrap-around (e.g. 23:00 – 02:00).
export function isInTimeRange(startHour: number, endHour: number): boolean {
  const hour = getCurrentHour();
  if (startHour <= endHour) {
    return hour >= startHour && hour < endHour;
  }
  // Wraps around midnight
  return hour >= startHour || hour < endHour;
}

// Format milliseconds into a readable "Xh Xm" string
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) { return `${hours}h ${minutes}m`; }
  return `${minutes}m`;
}
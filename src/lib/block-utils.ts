/**
 * Utility functions for calculating 30-minute blocks.
 * Blocks start at midnight (00:00) and are 30 minutes each.
 * Block 0: 00:00-00:30, Block 1: 00:30-01:00, etc.
 */

/**
 * Utility functions for calculating 30-minute blocks.
 * Blocks start at midnight (00:00) and are 30 minutes each.
 * Block 0: 00:00-00:30, Block 1: 00:30-01:00, etc.
 */

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur";

/**
 * Calculate the 30-minute block start time from a given timestamp.
 * Blocks start at midnight and are 30 minutes each.
 * Uses the configured timezone (default: Asia/Kuala_Lumpur).
 * 
 * @param timestamp - ISO string or Date object (UTC)
 * @returns ISO string of the block start time (in UTC, representing the local midnight block start)
 */
export function getBlockStart(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  // Get the date/time components in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)!.value;
  
  const year = parseInt(getPart('year'));
  const month = parseInt(getPart('month')) - 1; // Month is 0-indexed
  const day = parseInt(getPart('day'));
  const hour = parseInt(getPart('hour'));
  const minute = parseInt(getPart('minute'));
  
  // Round down to the nearest 30-minute block
  const roundedMinutes = Math.floor(minute / 30) * 30;
  
  // Get timezone offset for the date by comparing UTC and timezone representations
  const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const dateInUTC = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = dateInUTC.getTime() - dateInTimezone.getTime();
  
  // Create UTC date from the local time components
  const blockStartLocal = new Date(Date.UTC(year, month, day, hour, roundedMinutes, 0));
  // Adjust by the offset to get the correct UTC time
  const blockStartUTC = new Date(blockStartLocal.getTime() - offsetMs);
  
  return blockStartUTC.toISOString();
}

/**
 * Calculate the 30-minute block end time from a block start time.
 * 
 * @param blockStart - ISO string of block start time
 * @returns ISO string of the block end time
 */
export function getBlockEnd(blockStart: string): string {
  const start = new Date(blockStart);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return end.toISOString();
}

/**
 * Get the current 30-minute block based on the last received reading timestamp.
 * In prototype mode, this determines the block from the reading timestamp, not real-world time.
 * 
 * @param lastReadingTs - ISO string of the last reading timestamp (device_ts)
 * @returns Object with block start and end times (ISO strings)
 */
export function getCurrentBlockFromReading(lastReadingTs: string | null | undefined): { start: string; end: string } | null {
  if (!lastReadingTs) {
    return null;
  }
  
  const start = getBlockStart(lastReadingTs);
  const end = getBlockEnd(start);
  
  return { start, end };
}

/**
 * Format block time range for display.
 * 
 * @param start - ISO string of block start
 * @param end - ISO string of block end
 * @param timezone - Timezone label (e.g., "Asia/Kuala_Lumpur")
 * @returns Formatted string like "14:00 – 14:30"
 */
export function formatBlockWindow(start: string, end: string, timezone: string = "Asia/Kuala_Lumpur"): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone
  });
  
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
  } catch {
    return "Invalid time range";
  }
}


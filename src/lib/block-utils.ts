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
  
  // Find the UTC time that represents this local time in the target timezone
  // We use an iterative approach: start with an approximation and refine it
  const desiredLocalMinutes = hour * 60 + roundedMinutes;
  
  // Start with the original UTC time as a base
  let candidateUTC = new Date(date.getTime());
  
  // Iterate to find the UTC time that produces the desired local time
  // This handles timezone offsets correctly, including day boundaries
  for (let i = 0; i < 10; i++) { // Max 10 iterations should be enough
    const candidateParts = formatter.formatToParts(candidateUTC);
    const getCandidatePart = (type: string) => candidateParts.find(p => p.type === type)!.value;
    
    const candidateYear = parseInt(getCandidatePart('year'));
    const candidateMonth = parseInt(getCandidatePart('month')) - 1;
    const candidateDay = parseInt(getCandidatePart('day'));
    const candidateHour = parseInt(getCandidatePart('hour'));
    const candidateMinute = parseInt(getCandidatePart('minute'));
    
    // Check if we have the right year, month, day, hour, and rounded minute
    if (candidateYear === year && 
        candidateMonth === month && 
        candidateDay === day && 
        candidateHour === hour && 
        candidateMinute === roundedMinutes) {
      return candidateUTC.toISOString();
    }
    
    // Calculate the difference and adjust
    const candidateLocalMinutes = candidateHour * 60 + candidateMinute;
    const diffMinutes = desiredLocalMinutes - candidateLocalMinutes;
    
    // Also account for day changes
    let dayDiff = 0;
    if (candidateYear !== year || candidateMonth !== month || candidateDay !== day) {
      // Day mismatch - adjust by a day
      const candidateDate = new Date(candidateYear, candidateMonth, candidateDay);
      const desiredDate = new Date(year, month, day);
      dayDiff = Math.round((desiredDate.getTime() - candidateDate.getTime()) / (24 * 60 * 60 * 1000));
    }
    
    // Adjust the candidate UTC time
    candidateUTC = new Date(candidateUTC.getTime() + diffMinutes * 60 * 1000 + dayDiff * 24 * 60 * 60 * 1000);
  }
  
  // Fallback: return the original date rounded to 30 minutes (won't be perfect but better than error)
  return candidateUTC.toISOString();
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


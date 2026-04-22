// convert UTC dateTime to Kigali dateTime
export function convertToKigaliTime(dateObject: Date): Date {
  const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000;

  // Get the UTC offset of the date in milliseconds
  // getTimezoneOffset() returns minutes BEHIND UTC, so we negate it
  const localOffsetMs = -dateObject.getTimezoneOffset() * 60 * 1000;

  // If already at UTC+2 (Kigali), return as-is
  if (localOffsetMs === KIGALI_OFFSET_MS) {
    return new Date(dateObject.getTime());
  }

  // Convert to UTC first, then apply Kigali offset
  const utcMs = dateObject.getTime() - localOffsetMs;
  return new Date(utcMs + KIGALI_OFFSET_MS);
}

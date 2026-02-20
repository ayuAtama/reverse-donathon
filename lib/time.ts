const TIMEZONE = "Asia/Jakarta";

/**
 * Get the current time as a Date object.
 */
export function now(): Date {
  return new Date();
}

/**
 * Format a Date to ISO string.
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Format remaining seconds into HH:MM:SS string.
 */
export function formatHHMMSS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

/**
 * Calculate remaining seconds from now to target.
 */
export function remainingSeconds(targetAt: string): number {
  const target = new Date(targetAt).getTime();
  const current = now().getTime();
  return Math.max(0, Math.floor((target - current) / 1000));
}

/**
 * Calculate reduction in seconds based on amount, rpPerUnit, and timeUnit.
 */
export function calculateReductionSeconds(
  amount: number,
  rpPerUnit: number,
  timeUnit: "seconds" | "minutes"
): number {
  const units = Math.floor(amount / rpPerUnit);
  if (timeUnit === "minutes") {
    return units * 60;
  }
  return units;
}

/**
 * Subtract seconds from a target datetime, clamping to no earlier than now.
 */
export function subtractSeconds(targetAt: string, seconds: number): string {
  const target = new Date(targetAt).getTime();
  const reduced = target - seconds * 1000;
  const current = now().getTime();
  const final = Math.max(reduced, current);
  return new Date(final).toISOString();
}

/**
 * Format a date string in Asia/Jakarta timezone for display.
 */
export function formatJakarta(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Calculate percentage remaining based on initial target and current target.
 * 100% = full time remaining, 0% = time is up.
 */
export function percentageRemaining(
  initialTargetAt: string,
  targetAt: string
): number {
  const currentTime = now().getTime();
  const initialTarget = new Date(initialTargetAt).getTime();
  const currentTarget = new Date(targetAt).getTime();

  const totalDuration = initialTarget - currentTime;
  const remainingDuration = currentTarget - currentTime;

  if (totalDuration <= 0) return 0;
  if (remainingDuration <= 0) return 0;

  const pct = (remainingDuration / totalDuration) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 100) / 100));
}

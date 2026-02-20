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
 * Calculate reduction in seconds based on amount, rpPerUnit, and secondsPerUnit.
 * Example: amount=5000, rpPerUnit=1000, secondsPerUnit=540 (9 min)
 *   => units = 5, reduction = 5 * 540 = 2700 seconds
 */
export function calculateReductionSeconds(
  amount: number,
  rpPerUnit: number,
  secondsPerUnit: number
): number {
  const units = Math.floor(amount / rpPerUnit);
  return units * secondsPerUnit;
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
 * Format secondsPerUnit into a human-readable string.
 * e.g. 540 => "9 minutes", 90 => "1 minute 30 seconds", 1 => "1 second"
 */
export function formatSecondsPerUnit(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0 seconds";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }
  if (seconds > 0) {
    parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
  }
  return parts.join(" ");
}

/**
 * Calculate percentage remaining based on initial target and current target.
 * 100% = full time remaining (now === when countdown was set), 0% = time is up.
 *
 * initialTargetAt is reset to match targetAt whenever the admin changes the
 * target datetime, so the "total window" is always initialTargetAt - now_at_reset.
 * Since we don't store the reset moment, we use the full span from now to
 * initialTargetAt as the denominator: pct = remaining / totalWindowFromNow.
 * This gives a linear countdown from ~100% down to 0%.
 */
export function percentageRemaining(
  initialTargetAt: string,
  targetAt: string
): number {
  const currentTime = now().getTime();
  const initialTarget = new Date(initialTargetAt).getTime();
  const currentTarget = new Date(targetAt).getTime();

  // Total window: from now to the initial (full) target
  const totalDuration = initialTarget - currentTime;
  // Remaining window: from now to the current (reduced) target
  const remainingDuration = currentTarget - currentTime;

  if (totalDuration <= 0) return 0;
  if (remainingDuration <= 0) return 0;

  const pct = (remainingDuration / totalDuration) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 100) / 100));
}

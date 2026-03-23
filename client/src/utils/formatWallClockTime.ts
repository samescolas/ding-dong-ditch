/**
 * Compute the wall-clock time for a recording at a given elapsed offset (seconds).
 *
 * Returns a human-readable time string (e.g. "10:05:30 AM") or null when the
 * timestamp is missing / invalid.
 */
export function formatWallClockTime(
  timestamp: string | null | undefined,
  elapsedSeconds: number,
): string | null {
  if (timestamp == null) return null;

  const base = new Date(timestamp);
  if (isNaN(base.getTime())) return null;

  const wall = new Date(base.getTime() + elapsedSeconds * 1000);
  return wall.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

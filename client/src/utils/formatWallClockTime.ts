/**
 * Compute the wall-clock time for a given position within a recording.
 *
 * @param isoTimestamp  ISO 8601 timestamp of the recording start
 * @param currentTimeSeconds  Elapsed seconds from the video player's currentTime
 * @returns Formatted wall-clock string (e.g. "2:34:15 PM"), or null for invalid input
 */
export function formatWallClockTime(
  isoTimestamp: string | null | undefined,
  currentTimeSeconds: number,
): string | null {
  if (!isoTimestamp) return null;

  const startMs = new Date(isoTimestamp).getTime();
  if (Number.isNaN(startMs)) return null;

  if (!Number.isFinite(currentTimeSeconds) || currentTimeSeconds < 0) {
    return null;
  }

  const wallMs = startMs + currentTimeSeconds * 1000;
  const wallDate = new Date(wallMs);

  const hours = wallDate.getHours();
  const minutes = wallDate.getMinutes();
  const seconds = wallDate.getSeconds();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${displayHours}:${mm}:${ss} ${period}`;
}

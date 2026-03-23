/**
 * Compute the wall-clock time for a position within a recording.
 *
 * @param timestamp  ISO-8601 string representing when the recording started
 * @param currentTime  Elapsed seconds into the recording
 * @returns Formatted wall-clock time (e.g. "2:34 PM"), or null when
 *          the inputs are invalid / missing.
 */
export function formatWallClockTime(
  timestamp: string | null | undefined,
  currentTime: number,
): string | null {
  // Guard: timestamp must be a non-empty, meaningful string
  if (
    timestamp == null ||
    timestamp === "" ||
    timestamp === "undefined" ||
    timestamp === "null"
  ) {
    return null;
  }

  // Guard: currentTime must be a finite number
  if (!Number.isFinite(currentTime)) {
    return null;
  }

  const startMs = Date.parse(timestamp);

  // Date.parse returns NaN for malformed strings
  if (Number.isNaN(startMs)) {
    return null;
  }

  const wallMs = startMs + currentTime * 1000;
  const wallDate = new Date(wallMs);

  // Extra safety: ensure the Date is valid
  if (Number.isNaN(wallDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(wallDate);
}

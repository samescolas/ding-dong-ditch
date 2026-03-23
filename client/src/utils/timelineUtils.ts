import type { TimeRange } from "../components/timeline/TimelineBar";

/**
 * Convert a pixel offset within the timeline track to a Date.
 *
 * @param pixelX  - horizontal pixel offset from the left edge of the track
 * @param trackWidth - total width of the track in pixels
 * @param timeRange - visible time range (from / to)
 * @returns the Date corresponding to the given pixel position
 */
export function pixelToTime(
  pixelX: number,
  trackWidth: number,
  timeRange: TimeRange,
): Date {
  const ratio = trackWidth > 0 ? pixelX / trackWidth : 0;
  const ms =
    timeRange.from.getTime() +
    ratio * (timeRange.to.getTime() - timeRange.from.getTime());
  return new Date(ms);
}

/**
 * Format a Date for the hover tooltip.
 *
 * - Range >= 24 h  -> "2:30 PM"     (h:mm AM/PM)
 * - Range < 1 h    -> "2:30:45 PM"  (h:mm:ss AM/PM)
 * - Otherwise      -> "2:30 PM"     (h:mm AM/PM)
 */
export function formatTooltipTime(date: Date, rangeMs: number): string {
  const ONE_HOUR = 60 * 60 * 1000;

  if (rangeMs < ONE_HOUR) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

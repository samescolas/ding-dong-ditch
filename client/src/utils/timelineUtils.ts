import type { TimelineRecording } from "../types/timeline.js";

export interface TimeRange {
  from: Date;
  to: Date;
}

/**
 * Convert a pixel position on the timeline track to a Date.
 *
 * Returns `null` for degenerate inputs (zero-width container, negative pixel, etc.)
 * to prevent downstream NaN / Infinity values.
 */
export function pixelToTime(
  pixelX: number,
  containerWidth: number,
  timeRange: TimeRange,
): Date | null {
  if (containerWidth <= 0) return null;
  if (pixelX < 0) return null;

  const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
  if (rangeMs <= 0) return null;

  const ratio = pixelX / containerWidth;
  return new Date(timeRange.from.getTime() + ratio * rangeMs);
}

/**
 * Minimum visual width (pixels) for a recording block on the timeline.
 * Sub-1-second clips still receive this minimum so they remain clickable.
 */
const MIN_BLOCK_WIDTH_PX = 4;

/**
 * Default recording duration (ms) used when only a single timestamp is available.
 */
const DEFAULT_DURATION_MS = 30_000; // 30 seconds

/**
 * Determine whether a pixel position on the timeline "hits" a recording block.
 *
 * Each recording occupies a horizontal span derived from its timestamp and a
 * fixed default duration. Blocks shorter than `MIN_BLOCK_WIDTH_PX` are inflated
 * to that minimum so sub-1-second clips remain interactive.
 *
 * Returns the matched recording or null.
 */
export function hitTestRecording(
  pixelX: number,
  recordings: TimelineRecording[],
  containerWidth: number,
  timeRange: TimeRange,
  durationMs: number = DEFAULT_DURATION_MS,
): TimelineRecording | null {
  if (containerWidth <= 0) return null;

  const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
  if (rangeMs <= 0) return null;
  const fromMs = timeRange.from.getTime();

  for (const rec of recordings) {
    if (!rec.timestamp) continue;
    const startMs = new Date(rec.timestamp).getTime();
    if (isNaN(startMs)) continue;

    const startPx = ((startMs - fromMs) / rangeMs) * containerWidth;
    const durationPx = (durationMs / rangeMs) * containerWidth;
    const blockWidth = Math.max(durationPx, MIN_BLOCK_WIDTH_PX);

    if (pixelX >= startPx && pixelX <= startPx + blockWidth) {
      return rec;
    }
  }

  return null;
}

/**
 * Format a timestamp for display in a tooltip (e.g. when hovering over the timeline).
 */
export function formatTooltipTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

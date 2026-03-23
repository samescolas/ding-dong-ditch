import type { TimeRange } from "../components/timeline/TimelineBar";

/**
 * Convert a pixel x-offset within the timeline bar to a timestamp.
 *
 * Uses linear interpolation: `from + (xOffset / containerWidth) * (to - from)`.
 * Values are clamped so offsets below 0 return `from` and offsets beyond
 * `containerWidth` return `to`.
 */
export function pixelToTime(
  xOffset: number,
  containerWidth: number,
  timeRange: TimeRange,
): Date {
  if (containerWidth <= 0) {
    return new Date(timeRange.from.getTime());
  }

  const ratio = Math.max(0, Math.min(1, xOffset / containerWidth));
  const fromMs = timeRange.from.getTime();
  const toMs = timeRange.to.getTime();

  return new Date(fromMs + ratio * (toMs - fromMs));
}

/**
 * Convert a timestamp to a pixel x-offset within the timeline bar.
 *
 * Inverse of `pixelToTime`. The result is clamped to [0, containerWidth].
 */
export function timeToPixel(
  time: Date,
  containerWidth: number,
  timeRange: TimeRange,
): number {
  const fromMs = timeRange.from.getTime();
  const toMs = timeRange.to.getTime();
  const rangeMs = toMs - fromMs;

  if (rangeMs <= 0 || containerWidth <= 0) {
    return 0;
  }

  const ratio = (time.getTime() - fromMs) / rangeMs;
  return Math.max(0, Math.min(containerWidth, ratio * containerWidth));
}

import type { TimelineRecording, TimeRange } from "../components/timeline/TimelineBar";

export interface HitTestResult {
  recording: TimelineRecording;
  /** 0–1 ratio representing how far into the gap between this recording and the next */
  offsetRatio: number;
}

/**
 * Convert a pixel X position (relative to the track element) into a timestamp.
 */
export function pixelToTime(
  pixelX: number,
  trackWidthPx: number,
  timeRange: TimeRange,
): number {
  const ratio = Math.max(0, Math.min(1, pixelX / trackWidthPx));
  const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
  return timeRange.from.getTime() + ratio * rangeMs;
}

/**
 * Given a timestamp, find the closest recording and compute an offset ratio.
 * Returns null if no recordings exist.
 *
 * The offsetRatio represents a normalized position (0–1) between the matched
 * recording and the next one (or end of range), useful for seek positioning.
 */
export function hitTestRecording(
  timestampMs: number,
  recordings: TimelineRecording[],
  timeRange: TimeRange,
): HitTestResult | null {
  if (recordings.length === 0) return null;

  // Recordings sorted by timestamp ascending
  const sorted = [...recordings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Find the closest recording to the given timestamp
  let closest = sorted[0];
  let closestDist = Math.abs(new Date(sorted[0].timestamp).getTime() - timestampMs);
  let closestIdx = 0;

  for (let i = 1; i < sorted.length; i++) {
    const dist = Math.abs(new Date(sorted[i].timestamp).getTime() - timestampMs);
    if (dist < closestDist) {
      closest = sorted[i];
      closestDist = dist;
      closestIdx = i;
    }
  }

  // Compute offset ratio between this recording and the next boundary
  const recMs = new Date(closest.timestamp).getTime();
  const nextBoundaryMs =
    closestIdx < sorted.length - 1
      ? new Date(sorted[closestIdx + 1].timestamp).getTime()
      : timeRange.to.getTime();

  const span = nextBoundaryMs - recMs;
  const offsetRatio = span > 0 ? Math.max(0, Math.min(1, (timestampMs - recMs) / span)) : 0;

  return { recording: closest, offsetRatio };
}

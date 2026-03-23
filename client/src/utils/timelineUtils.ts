import type { TimelineRecording, TimeRange } from "../components/timeline/TimelineBar";

/**
 * Convert a pixel offset within the timeline track to a Date timestamp.
 *
 * @param px - The pixel offset from the left edge of the track
 * @param trackWidthPx - The total width of the track in pixels
 * @param timeRange - The visible time range
 * @returns The corresponding Date
 */
export function pixelToTime(px: number, trackWidthPx: number, timeRange: TimeRange): Date {
  const ratio = Math.max(0, Math.min(1, px / trackWidthPx));
  const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
  return new Date(timeRange.from.getTime() + ratio * rangeMs);
}

export interface HitTestResult {
  recording: TimelineRecording;
  /** 0 means the timestamp is in a gap (nearest recording returned); >0 means within a recording block */
  offsetRatio: number;
}

/**
 * Given a timestamp, find the nearest recording.
 *
 * Since recordings in this app are point-in-time events (no duration),
 * every click is essentially a "gap" — we find the recording whose timestamp
 * is closest to the given time.
 *
 * Returns null if there are no recordings.
 *
 * @param timestamp - The target timestamp
 * @param recordings - The list of recordings to search
 * @returns The closest recording with offsetRatio 0 (gap click), or null
 */
export function hitTestRecording(
  timestamp: Date,
  recordings: TimelineRecording[],
): HitTestResult | null {
  if (recordings.length === 0) return null;

  let nearest: TimelineRecording | null = null;
  let minDistance = Infinity;
  const targetMs = timestamp.getTime();

  for (const rec of recordings) {
    const recMs = new Date(rec.timestamp).getTime();
    const distance = Math.abs(recMs - targetMs);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = rec;
    }
  }

  if (!nearest) return null;

  return { recording: nearest, offsetRatio: 0 };
}

import type { TimelineRecording } from "../types/timeline";

export interface TimeRange {
  from: Date;
  to: Date;
}

/**
 * Convert a pixel offset within a container to a Date within the given time range.
 */
export function pixelToTime(
  pixelX: number,
  containerWidth: number,
  timeRange: TimeRange,
): Date {
  const ratio = Math.max(0, Math.min(1, pixelX / containerWidth));
  const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
  return new Date(timeRange.from.getTime() + ratio * rangeMs);
}

/**
 * Convert a Date to a pixel offset within a container for the given time range.
 */
export function timeToPixel(
  time: Date,
  containerWidth: number,
  timeRange: TimeRange,
): number {
  const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
  if (rangeMs === 0) return 0;
  const ratio = (time.getTime() - timeRange.from.getTime()) / rangeMs;
  return ratio * containerWidth;
}

/** Default recording duration in milliseconds (30 seconds). */
export const DEFAULT_RECORDING_DURATION_MS = 30_000;

export interface HitTestResult {
  recording: TimelineRecording;
  /** 0..1 ratio of how far into the recording the timestamp falls. 0 means the start or a gap hit (nearest). */
  offsetRatio: number;
}

/**
 * Given a timestamp, find the recording that contains it or the nearest recording.
 *
 * Uses binary search for O(log n) performance.
 *
 * @param timestamp - The point in time to test
 * @param recordings - Recordings sorted by timestamp ASC
 * @param durationMs - Duration of each recording in ms (default 30s)
 * @returns The hit recording with offset ratio, or null if recordings is empty
 */
export function hitTestRecording(
  timestamp: Date,
  recordings: TimelineRecording[],
  durationMs: number = DEFAULT_RECORDING_DURATION_MS,
): HitTestResult | null {
  if (recordings.length === 0) return null;

  const targetMs = timestamp.getTime();

  // Binary search: find the last recording whose start time <= targetMs
  let lo = 0;
  let hi = recordings.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const midMs = new Date(recordings[mid].timestamp).getTime();
    if (midMs <= targetMs) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  // After binary search: hi is the index of the last recording with start <= targetMs
  // lo = hi + 1 is the first recording with start > targetMs

  // Check if timestamp falls within recording at index hi
  if (hi >= 0) {
    const rec = recordings[hi];
    const startMs = new Date(rec.timestamp).getTime();
    const endMs = startMs + durationMs;
    if (targetMs <= endMs) {
      const offsetRatio = durationMs > 0 ? (targetMs - startMs) / durationMs : 0;
      return { recording: rec, offsetRatio: Math.min(offsetRatio, 1) };
    }
  }

  // Check if timestamp falls within recording at index lo (next recording)
  if (lo < recordings.length) {
    const rec = recordings[lo];
    const startMs = new Date(rec.timestamp).getTime();
    // targetMs < startMs here, so it can't be within this recording
    // (recording starts after the target)
  }

  // Timestamp is in a gap — find nearest recording
  const candidateLeft = hi >= 0 ? hi : -1;
  const candidateRight = lo < recordings.length ? lo : -1;

  if (candidateLeft === -1 && candidateRight === -1) {
    // Should never happen since we checked length > 0
    return null;
  }

  if (candidateLeft === -1) {
    return { recording: recordings[candidateRight], offsetRatio: 0 };
  }

  if (candidateRight === -1) {
    return { recording: recordings[candidateLeft], offsetRatio: 0 };
  }

  // Both candidates exist — pick the closer one
  const leftEndMs = new Date(recordings[candidateLeft].timestamp).getTime() + durationMs;
  const rightStartMs = new Date(recordings[candidateRight].timestamp).getTime();
  const distToLeft = targetMs - leftEndMs;
  const distToRight = rightStartMs - targetMs;

  if (distToLeft <= distToRight) {
    return { recording: recordings[candidateLeft], offsetRatio: 0 };
  }
  return { recording: recordings[candidateRight], offsetRatio: 0 };
}

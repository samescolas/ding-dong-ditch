import type { TimelineRecording } from "../types/timeline.js";

/**
 * Return the most recent recording from a list (by timestamp).
 * Recordings with null / invalid timestamps are skipped.
 * Returns null when the list is empty or contains no valid timestamps.
 */
export function findLatestRecording(
  recordings: TimelineRecording[],
): TimelineRecording | null {
  let latest: TimelineRecording | null = null;
  let latestMs = -Infinity;

  for (const rec of recordings) {
    if (!rec.timestamp) continue;
    const ms = new Date(rec.timestamp).getTime();
    if (isNaN(ms)) continue;
    if (ms > latestMs) {
      latestMs = ms;
      latest = rec;
    }
  }

  return latest;
}

/**
 * Resolve which recording should be auto-selected when the timeline first loads.
 *
 * Strategy: pick the latest recording. If the list is empty or all timestamps
 * are invalid, return null so the player stays in its empty state.
 */
export function resolveAutoJump(
  recordings: TimelineRecording[],
): TimelineRecording | null {
  return findLatestRecording(recordings);
}

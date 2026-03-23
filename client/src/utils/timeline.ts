import type { TimelineRecording } from "../types/timeline";

/**
 * Find the recording with the most recent timestamp.
 * Returns null when the array is empty or contains no valid timestamps.
 */
export function findLatestRecording(
  recordings: TimelineRecording[],
): TimelineRecording | null {
  if (recordings.length === 0) return null;

  let latest: TimelineRecording | null = null;
  let latestTime = -Infinity;

  for (const rec of recordings) {
    const t = new Date(rec.timestamp).getTime();
    if (Number.isFinite(t) && t > latestTime) {
      latestTime = t;
      latest = rec;
    }
  }

  return latest;
}

/**
 * Determines the auto-jump selection.
 *
 * On first load (hasAutoJumped === false), returns the latest recording.
 * On subsequent calls (hasAutoJumped === true), returns the current selection
 * unchanged — filter changes must not re-trigger auto-jump.
 */
export function resolveAutoJump(
  recordings: TimelineRecording[],
  currentSelection: TimelineRecording | null,
  hasAutoJumped: boolean,
): { selected: TimelineRecording | null; shouldMarkJumped: boolean } {
  // Already auto-jumped once — don't override the user's selection
  if (hasAutoJumped) {
    return { selected: currentSelection, shouldMarkJumped: false };
  }

  // First load: jump to latest
  const latest = findLatestRecording(recordings);
  return { selected: latest, shouldMarkJumped: latest !== null };
}

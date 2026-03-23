import type { TimelineRecording } from "../components/timeline/TimelineBar";

/**
 * Finds the recording with the highest (most recent) timestamp.
 * Returns `null` when the array is empty.
 */
export function findLatestRecording(
  recordings: TimelineRecording[],
): TimelineRecording | null {
  if (recordings.length === 0) return null;
  return recordings.reduce((latest, rec) =>
    rec.timestamp > latest.timestamp ? rec : latest,
  );
}

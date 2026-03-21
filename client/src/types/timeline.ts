export interface TimelineRecording {
  id: number;
  timestamp: string;
  event_type: string;
  snapshot_key: string | null;
  path: string;
}

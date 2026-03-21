export interface TimelineRecording {
  id: number;
  timestamp: string;
  event_type: string;
  snapshot_key: string | null;
  path: string;
  /** Available from the full recording API, not the lightweight timeline API. */
  description?: string | null;
  /** File size in bytes. Available from the full recording API. */
  size?: number | null;
}

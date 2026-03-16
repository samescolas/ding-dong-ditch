export interface DefaultsConfig {
  recordingDuration: number;
  cooldownSeconds: number;
  retentionDays: number;
}

export interface CameraConfig {
  enabled: boolean;
  recordingDuration: number;
  cooldownSeconds: number;
}

export interface AppConfig {
  refreshToken: string | null;
  cameras: Record<string, CameraConfig>;
  defaults: DefaultsConfig;
}

export type { RecordingMetadata as RecordingEntry } from "./storage/backend.js";

export interface LoginSession {
  restClient: import("ring-client-api/rest-client").RingRestClient;
  createdAt: number;
}

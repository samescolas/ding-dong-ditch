import type { Response } from "express";

export interface RecordingMetadata {
  date: string;
  camera: string;
  file: string;
  path: string;       // relative key: "2024-01-15/Front_Door/14-30-00.mp4"
  size: number;
  created: Date;
  snapshot_key?: string;  // corresponding .jpg key if found
}

export interface StorageBackend {
  persist(localPath: string, key: string): Promise<void>;
  list(): Promise<RecordingMetadata[]>;
  serve(key: string, res: Response): Promise<void>;
  delete(key: string): Promise<void>;
  deleteOlderThan(cutoffDate: string): Promise<void>;
  getLocalPath(key: string): Promise<string>;
}

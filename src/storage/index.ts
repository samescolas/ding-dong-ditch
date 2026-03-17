import path from "path";
import type { StorageBackend } from "./backend.js";
import { LocalStorageBackend } from "./local.js";
import { log } from "../logger.js";

export type { StorageBackend, RecordingMetadata } from "./backend.js";

let storage: StorageBackend | null = null;

export function getStorage(): StorageBackend {
  if (!storage) throw new Error("Storage not initialized — call initStorage() first");
  return storage;
}

export async function initStorage(): Promise<void> {
  const backend = process.env.STORAGE_BACKEND || "local";

  switch (backend) {
    case "local": {
      const basePath = process.env.RECORDINGS_PATH || path.join(process.cwd(), "recordings");
      storage = new LocalStorageBackend(basePath);
      log.info(`[storage] using local backend: ${basePath}`);
      break;
    }
    case "s3": {
      // Dynamic import so @aws-sdk is only loaded when s3 is selected
      const { S3StorageBackend } = await import("./s3.js");
      storage = await S3StorageBackend.create();
      log.info(`[storage] using S3 backend: ${process.env.S3_BUCKET}`);
      break;
    }
    default:
      throw new Error(`Unknown STORAGE_BACKEND: ${backend} (expected "local" or "s3")`);
  }
}

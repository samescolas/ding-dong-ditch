import fs from "fs";
import { isAiEnabled, describeSnapshot } from "./describe.js";
import { extractFrameFromVideo } from "./extract-frame.js";
import { getStorage } from "../storage/index.js";
import {
  getRecordingsWithoutDescription,
  updateRecordingDescription,
} from "../db/recordings.js";
import { log } from "../logger.js";

export interface RedescribeResult {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
}

let running = false;

export function isRedescribeRunning(): boolean {
  return running;
}

export async function redescribeRecordings(
  limit: number
): Promise<RedescribeResult> {
  if (!isAiEnabled()) {
    throw new Error("AI is not enabled");
  }

  if (running) {
    throw new Error("Redescribe already in progress");
  }

  running = true;
  try {
    const rows = getRecordingsWithoutDescription(limit);
    const result: RedescribeResult = {
      total: rows.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
    };

    const storage = getStorage();

    for (const row of rows) {
      result.processed++;
      let tempPath: string | null = null;

      try {
        let imageBuffer: Buffer;

        if (row.snapshot_key) {
          const localPath = await storage.getLocalPath(row.snapshot_key);
          imageBuffer = fs.readFileSync(localPath);
          // If S3, the path is a temp file — track for cleanup
          if (localPath.includes("ddd-")) {
            tempPath = localPath;
          }
        } else {
          const videoPath = await storage.getLocalPath(row.path);
          if (videoPath.includes("ddd-")) {
            tempPath = videoPath;
          }
          imageBuffer = await extractFrameFromVideo(videoPath);
        }

        const description = await describeSnapshot(imageBuffer, row.camera);
        const fallback = `Motion detected on ${row.camera}`;

        if (description === fallback) {
          result.failed++;
          log.warn(`[redescribe] ${row.path}: got fallback description`);
        } else {
          updateRecordingDescription(row.id, description);
          result.succeeded++;
          log.info(`[redescribe] ${row.path}: ${description}`);
        }
      } catch (e) {
        result.failed++;
        log.warn(
          `[redescribe] ${row.path}: ${(e as Error).message}`
        );
      } finally {
        if (tempPath) {
          try {
            fs.unlinkSync(tempPath);
          } catch {
            // ignore cleanup errors
          }
        }
      }
    }

    return result;
  } finally {
    running = false;
  }
}

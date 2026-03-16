import fs from "fs";
import os from "os";
import path from "path";
import type { RingCamera } from "ring-client-api";
import { getStorage } from "../storage/index.js";

const TMP_DIR = path.join(os.tmpdir(), "ring-tmp");

function tempPath(cameraName: string): { filePath: string; key: string } {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 19).replace(/:/g, "-");
  const safeName = cameraName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = `${date}/${safeName}/${time}.mp4`;

  const dir = path.join(TMP_DIR, date, safeName);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${time}.mp4`);

  return { filePath, key };
}

export async function recordClip(cam: RingCamera, durationSeconds: number): Promise<void> {
  const { filePath, key } = tempPath(cam.name);
  console.log(`[rec] ${cam.name}: recording ${durationSeconds}s → ${key}`);

  const liveCall = await cam.startLiveCall();

  try {
    await liveCall.startTranscoding({
      output: [
        "-t", String(durationSeconds),
        "-movflags", "faststart",
        "-pix_fmt", "yuv420p",
        filePath,
      ],
    });

    // startTranscoding returns when transcoding setup is done;
    // wait for the full duration plus a safety margin
    await new Promise<void>((resolve) => {
      setTimeout(resolve, (durationSeconds + 5) * 1000);
    });

    await getStorage().persist(filePath, key);
    console.log(`[rec] ${cam.name}: saved ${key}`);
  } finally {
    try { await liveCall.stop(); } catch { /* ignore */ }
  }
}

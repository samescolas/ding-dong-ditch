import fs from "fs";
import os from "os";
import path from "path";
import type { RingCamera } from "ring-client-api";
import { getStorage } from "../storage/index.js";
import { log } from "../logger.js";

const TMP_DIR = path.join(os.tmpdir(), "ring-tmp");

export async function captureSnapshot(cam: RingCamera): Promise<{ key: string; buffer: Buffer } | null> {
  try {
    const buffer = await cam.getSnapshot();

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toISOString().slice(11, 19).replace(/:/g, "-");
    const safeName = cam.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const key = `${date}/${safeName}/${time}.jpg`;

    const dir = path.join(TMP_DIR, date, safeName);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${time}.jpg`);

    fs.writeFileSync(filePath, buffer);
    await getStorage().persist(filePath, key);

    log.info(`[snapshot] ${cam.name}: saved ${key}`);
    return { key, buffer };
  } catch (e) {
    log.error(`[snapshot] ${cam.name}: failed: ${(e as Error).message}`);
    return null;
  }
}

import type { RingCamera } from "ring-client-api";
import { recordClip } from "./clip-recorder.js";
import { getCameraConfig } from "../config/store.js";
import { captureSnapshot } from "./snapshot.js";
import { describeSnapshot } from "../ai/describe.js";
import { log } from "../logger.js";

interface CameraState {
  recording: boolean;
  lastRecordAt: number;
}

const state = new Map<number, CameraState>();

function getState(camId: number): CameraState {
  if (!state.has(camId)) {
    state.set(camId, { recording: false, lastRecordAt: 0 });
  }
  return state.get(camId)!;
}

export async function handleMotion(cam: RingCamera): Promise<void> {
  const s = getState(cam.id);
  const cfg = getCameraConfig(cam.id);
  const now = Date.now();

  if (s.recording || now - s.lastRecordAt < cfg.cooldownSeconds * 1000) {
    log.info(`[skip] ${cam.name}: busy or in cooldown`);
    return;
  }

  s.recording = true;
  s.lastRecordAt = now;

  // Capture snapshot at the moment of motion, before recording starts
  const snapshot = await captureSnapshot(cam);

  // Start AI description concurrently — it runs during the recording
  const descriptionPromise = snapshot
    ? describeSnapshot(snapshot.buffer, cam.name)
    : Promise.resolve(undefined);

  try {
    await recordClip(cam, cfg.recordingDuration, snapshot?.key, descriptionPromise);
  } catch (e) {
    log.error(`[rec] ${cam.name}: error:`, (e as Error).message);
  } finally {
    s.recording = false;
  }
}

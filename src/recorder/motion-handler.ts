import type { RingCamera } from "ring-client-api";
import { recordClip } from "./clip-recorder.js";
import { getCameraConfig } from "../config/store.js";

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
    console.log(`[skip] ${cam.name}: busy or in cooldown`);
    return;
  }

  s.recording = true;
  s.lastRecordAt = now;

  try {
    await recordClip(cam, cfg.recordingDuration);
  } catch (e) {
    console.error(`[rec] ${cam.name}: error:`, (e as Error).message);
  } finally {
    s.recording = false;
  }
}

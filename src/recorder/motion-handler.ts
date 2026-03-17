import type { RingCamera } from "ring-client-api";
import { recordClip } from "./clip-recorder.js";
import { getCameraConfig } from "../config/store.js";
import { captureSnapshot } from "./snapshot.js";
import { describeSnapshot } from "../ai/describe.js";
import { log } from "../logger.js";

interface CameraState {
  recording: boolean;
  lastRecordAt: number;
  currentEventTypeRef: { value: 'motion' | 'doorbell' };
}

const state = new Map<number, CameraState>();

function getState(camId: number): CameraState {
  if (!state.has(camId)) {
    state.set(camId, { recording: false, lastRecordAt: 0, currentEventTypeRef: { value: 'motion' } });
  }
  return state.get(camId)!;
}

export async function handleMotion(cam: RingCamera, eventType: 'motion' | 'doorbell' = 'motion'): Promise<void> {
  const s = getState(cam.id);
  const cfg = getCameraConfig(cam.id);
  const now = Date.now();

  if (s.recording) {
    // Doorbell takes priority: upgrade an in-flight motion recording
    if (eventType === 'doorbell' && s.currentEventTypeRef.value === 'motion') {
      s.currentEventTypeRef.value = 'doorbell';
      log.info(`[evt] ${cam.name}: doorbell arrived during motion recording — upgrading event type`);
    } else {
      log.info(`[skip] ${cam.name}: busy`);
    }
    return;
  }

  if (now - s.lastRecordAt < cfg.cooldownSeconds * 1000) {
    log.info(`[skip] ${cam.name}: in cooldown`);
    return;
  }

  s.recording = true;
  s.lastRecordAt = now;
  s.currentEventTypeRef = { value: eventType };

  // Capture snapshot at the moment of motion, before recording starts
  const snapshot = await captureSnapshot(cam);

  // Start AI description concurrently — it runs during the recording
  const descriptionPromise = snapshot
    ? describeSnapshot(snapshot.buffer, cam.name)
    : Promise.resolve(undefined);

  try {
    await recordClip(cam, cfg.recordingDuration, snapshot?.key, descriptionPromise, s.currentEventTypeRef);
  } catch (e) {
    log.error(`[rec] ${cam.name}: error:`, (e as Error).message);
  } finally {
    s.recording = false;
  }
}

import { RingApi, RingCamera } from "ring-client-api";
import { getConfig, setToken, getCameraConfig } from "../config/store.js";
import { handleMotion } from "./motion-handler.js";
import { publishDiscovery } from "../mqtt/publisher.js";
import { log } from "../logger.js";
import type { Subscription } from "rxjs";

let ringApi: RingApi | null = null;
let cameras: RingCamera[] = [];
let subscriptions: Subscription[] = [];

export function getRingApi(): RingApi | null {
  return ringApi;
}

export function getCameras(): RingCamera[] {
  return cameras;
}

export async function start(): Promise<void> {
  const token = getConfig().refreshToken;
  if (!token) {
    log.info("[ring] no refresh token configured, skipping init");
    return;
  }

  try {
    ringApi = new RingApi({
      refreshToken: token,
      cameraStatusPollingSeconds: 20,
    });

    ringApi.onRefreshTokenUpdated.subscribe({
      next: (newToken: { newRefreshToken: string }) => {
        log.info("[auth] refresh token updated, persisting");
        setToken(newToken.newRefreshToken);
      },
    });

    cameras = await ringApi.getCameras();
    log.info(`[ring] found ${cameras.length} camera(s): ${cameras.map((c) => c.name).join(", ")}`);

    // Publish HA MQTT discovery for all cameras on startup
    for (const cam of cameras) {
      publishDiscovery(cam.name);
    }

    subscribe();
  } catch (e) {
    log.error("[ring] failed to initialize:", (e as Error).message);
    ringApi = null;
    cameras = [];
  }
}

export async function stop(): Promise<void> {
  unsubscribe();
  if (ringApi) {
    ringApi.disconnect();
    ringApi = null;
  }
  cameras = [];
}

export async function restart(): Promise<void> {
  await stop();
  await start();
}

function subscribe(): void {
  unsubscribe();

  for (const cam of cameras) {
    const camCfg = getCameraConfig(cam.id);
    if (!camCfg.enabled) {
      log.info(`[ring] ${cam.name}: monitoring disabled, skipping`);
      continue;
    }

    log.info(`[ring] ${cam.name}: subscribing to motion events`);

    if (cam.onMotionDetected) {
      const sub = cam.onMotionDetected.subscribe((active: boolean) => {
        if (active) {
          log.info(`[evt] ${cam.name}: motion detected`);
          handleMotion(cam);
        }
      });
      subscriptions.push(sub);
    }

    if (cam.onDoorbellPressed) {
      const sub = cam.onDoorbellPressed.subscribe(() => {
        log.info(`[evt] ${cam.name}: doorbell pressed`);
        handleMotion(cam);
      });
      subscriptions.push(sub);
    }
  }
}

function unsubscribe(): void {
  for (const sub of subscriptions) {
    try { sub.unsubscribe(); } catch { /* ignore */ }
  }
  subscriptions = [];
}

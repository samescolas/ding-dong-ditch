import { Router, type Request, type Response } from "express";
import { getCameras, restart } from "../recorder/manager.js";
import { getCameraConfig, setCameraConfig } from "../config/store.js";
import type { CameraConfig } from "../types.js";

const router = Router();

// List cameras with their config
router.get("/", (_req: Request, res: Response) => {
  const cams = getCameras().map((c) => ({
    id: c.id,
    name: c.name,
    model: c.model,
    hasLight: c.hasLight,
    hasSiren: c.hasSiren,
    hasBattery: c.hasBattery,
    config: getCameraConfig(c.id),
  }));
  res.json(cams);
});

// Update camera config
router.put("/:id/config", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { enabled, recordingDuration, cooldownSeconds } = req.body;

  const update: Partial<CameraConfig> = {};
  if (typeof enabled === "boolean") update.enabled = enabled;
  if (typeof recordingDuration === "number" && recordingDuration > 0)
    update.recordingDuration = recordingDuration;
  if (typeof cooldownSeconds === "number" && cooldownSeconds >= 0)
    update.cooldownSeconds = cooldownSeconds;

  const cfg = setCameraConfig(id, update);
  await restart();
  res.json(cfg);
});

export default router;

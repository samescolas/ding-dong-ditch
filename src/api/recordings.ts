import { Router, type Request, type Response } from "express";
import { getStorage } from "../storage/index.js";
import { queryRecordings, queryTimelineRecordings, deleteRecordingByPath, getRecordingByPath, getDistinctCameras } from "../db/recordings.js";
import { isAiEnabled } from "../ai/describe.js";
import { redescribeRecordings, isRedescribeRunning } from "../ai/redescribe.js";
import { log } from "../logger.js";

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FILE_RE = /^\d{2}-\d{2}-\d{2}\.(mp4|jpg)$/;

/** Allow any camera name except path-traversal characters. */
function isValidCameraSegment(camera: string): boolean {
  return camera.length > 0 && !camera.includes("..") && !camera.includes("/") && !camera.includes("\\");
}

function isValidPath(date: string, camera: string, file: string): boolean {
  return DATE_RE.test(date) && isValidCameraSegment(camera) && FILE_RE.test(file);
}

function isValidRecordingPath(p: string): boolean {
  const parts = p.split("/");
  if (parts.length !== 3) return false;
  const [date, camera, file] = parts;
  return DATE_RE.test(date) && isValidCameraSegment(camera) && FILE_RE.test(file);
}

// List recordings with filtering, search, and pagination
router.get("/", (_req: Request, res: Response) => {
  try {
    const { camera, dateFrom, dateTo, search, eventType, limit, offset } = _req.query;
    const parsedLimit = Number(limit);
    const parsedOffset = Number(offset);
    const result = queryRecordings({
      camera: camera as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      search: search as string | undefined,
      eventType: eventType as string | undefined,
      limit: limit && Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : undefined,
      offset: offset && Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : undefined,
    });
    res.json(result);
  } catch (e) {
    log.error("[recordings] list error:", (e as Error).message);
    res.status(500).json({ error: "failed to list recordings" });
  }
});

// Distinct camera names for filter dropdown
router.get("/cameras", (_req: Request, res: Response) => {
  try {
    res.json(getDistinctCameras());
  } catch (e) {
    log.error("[recordings] cameras error:", (e as Error).message);
    res.status(500).json({ error: "failed to list cameras" });
  }
});

// Re-describe recordings that have no AI description
router.post("/redescribe", async (_req: Request, res: Response) => {
  if (!isAiEnabled()) {
    return res.status(400).json({ error: "AI is not enabled" });
  }

  if (isRedescribeRunning()) {
    return res.status(409).json({ error: "Redescribe already in progress" });
  }

  const body = _req.body as { limit?: number } | undefined;
  const limit = Math.min(Math.max(body?.limit ?? 10, 1), 50);

  try {
    const result = await redescribeRecordings(limit);
    res.json(result);
  } catch (e) {
    log.error("[recordings] redescribe error:", (e as Error).message);
    res.status(500).json({ error: "failed to redescribe recordings" });
  }
});

// Timeline recordings (lightweight)
router.get("/timeline", (_req: Request, res: Response) => {
  try {
    const { camera, from, to, eventType } = _req.query;
    if (!camera || !from || !to) {
      return res.status(400).json({ error: "camera, from, and to are required" });
    }
    const data = queryTimelineRecordings(
      camera as string,
      from as string,
      to as string,
      eventType as string | undefined,
    );
    res.json(data);
  } catch (e) {
    log.error("[recordings] timeline error:", (e as Error).message);
    res.status(500).json({ error: "failed to query timeline" });
  }
});

// Bulk delete clips
router.post("/bulk-delete", async (req: Request, res: Response) => {
  const { paths } = req.body as { paths?: unknown };
  if (!Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({ error: "paths must be a non-empty array" });
  }
  if (paths.length > 500) {
    return res.status(400).json({ error: "too many paths (max 500)" });
  }
  const safePaths = (paths as string[]).filter((p) => typeof p === "string" && isValidRecordingPath(p));
  if (safePaths.length !== paths.length) {
    return res.status(400).json({ error: "invalid path" });
  }

  let deleted = 0;
  let errors = 0;
  for (const p of safePaths) {
    try {
      const rec = getRecordingByPath(p);
      await getStorage().delete(p);
      if (rec?.snapshot_key) {
        await getStorage().delete(rec.snapshot_key).catch(() => {});
      }
      deleteRecordingByPath(p);
      deleted++;
    } catch {
      errors++;
    }
  }
  res.json({ deleted, errors });
});

// Serve a clip
router.get("/:date/:camera/:file", async (req: Request, res: Response) => {
  const date = req.params.date as string;
  const camera = req.params.camera as string;
  const file = req.params.file as string;

  if (!isValidPath(date, camera, file)) {
    return res.status(400).json({ error: "invalid path" });
  }

  try {
    await getStorage().serve(`${date}/${camera}/${file}`, res);
  } catch (e) {
    log.error("[recordings] serve error:", (e as Error).message);
    res.status(500).json({ error: "failed to serve recording" });
  }
});

// Delete a clip
router.delete("/:date/:camera/:file", async (req: Request, res: Response) => {
  const date = req.params.date as string;
  const camera = req.params.camera as string;
  const file = req.params.file as string;

  if (!isValidPath(date, camera, file)) {
    return res.status(400).json({ error: "invalid path" });
  }

  const key = `${date}/${camera}/${file}`;
  try {
    const rec = getRecordingByPath(key);
    await getStorage().delete(key);
    if (rec?.snapshot_key) {
      await getStorage().delete(rec.snapshot_key).catch(() => {});
    }
    deleteRecordingByPath(key);
    res.json({ ok: true });
  } catch (e) {
    log.error("[recordings] delete error:", (e as Error).message);
    res.status(500).json({ error: "failed to delete recording" });
  }
});

export default router;

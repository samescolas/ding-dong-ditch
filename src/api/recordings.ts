import { Router, type Request, type Response } from "express";
import { getStorage } from "../storage/index.js";
import { queryRecordings, deleteRecordingByPath, getDistinctCameras } from "../db/recordings.js";
import { log } from "../logger.js";

const router = Router();

// List recordings with filtering, search, and pagination
router.get("/", (_req: Request, res: Response) => {
  try {
    const { camera, dateFrom, dateTo, search, limit, offset } = _req.query;
    const result = queryRecordings({
      camera: camera as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      search: search as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
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

// Serve a clip
router.get("/:date/:camera/:file", async (req: Request, res: Response) => {
  const date = req.params.date as string;
  const camera = req.params.camera as string;
  const file = req.params.file as string;

  if (/\.\./.test(date + camera + file)) {
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

  if (/\.\./.test(date + camera + file)) {
    return res.status(400).json({ error: "invalid path" });
  }

  const key = `${date}/${camera}/${file}`;
  try {
    await getStorage().delete(key);
    deleteRecordingByPath(key);
    res.json({ ok: true });
  } catch (e) {
    log.error("[recordings] delete error:", (e as Error).message);
    res.status(500).json({ error: "failed to delete recording" });
  }
});

export default router;

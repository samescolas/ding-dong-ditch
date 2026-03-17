import { Router, type Request, type Response } from "express";
import { getStorage } from "../storage/index.js";
import { log } from "../logger.js";

const router = Router();

// List recordings
router.get("/", async (_req: Request, res: Response) => {
  try {
    const results = await getStorage().list();
    res.json(results);
  } catch (e) {
    log.error("[recordings] list error:", (e as Error).message);
    res.status(500).json({ error: "failed to list recordings" });
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

  try {
    await getStorage().delete(`${date}/${camera}/${file}`);
    res.json({ ok: true });
  } catch (e) {
    log.error("[recordings] delete error:", (e as Error).message);
    res.status(500).json({ error: "failed to delete recording" });
  }
});

export default router;

import { Router } from "express";
import fs from "fs";
import path from "path";

const RECORDINGS_PATH = process.env.RECORDINGS_PATH || "/recordings";
const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL || "";
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER || "";
const NEXTCLOUD_PASS = process.env.NEXTCLOUD_PASS || "";
const router = Router();

// List recordings grouped by date/camera
router.get("/", (req, res) => {
  const results = [];

  try {
    const dates = fs.readdirSync(RECORDINGS_PATH).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();

    for (const date of dates) {
      const datePath = path.join(RECORDINGS_PATH, date);
      const cameras = fs.readdirSync(datePath).filter((f) => {
        return fs.statSync(path.join(datePath, f)).isDirectory();
      });

      for (const camera of cameras) {
        const camPath = path.join(datePath, camera);
        const files = fs.readdirSync(camPath).filter((f) => f.endsWith(".mp4"));

        for (const file of files) {
          const filePath = path.join(camPath, file);
          const stat = fs.statSync(filePath);
          results.push({
            date,
            camera,
            file,
            path: `${date}/${camera}/${file}`,
            size: stat.size,
            created: stat.birthtime,
          });
        }
      }
    }
  } catch {
    // recordings dir may not exist yet
  }

  res.json(results);
});

// Serve a clip
router.get("/:date/:camera/:file", (req, res) => {
  const { date, camera, file } = req.params;

  // Sanitize path components
  if (/\.\./.test(date + camera + file)) {
    return res.status(400).json({ error: "invalid path" });
  }

  const filePath = path.join(RECORDINGS_PATH, date, camera, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "not found" });
  }

  res.sendFile(filePath);
});

// Delete a clip
router.delete("/:date/:camera/:file", (req, res) => {
  const { date, camera, file } = req.params;

  if (/\.\./.test(date + camera + file)) {
    return res.status(400).json({ error: "invalid path" });
  }

  const filePath = path.join(RECORDINGS_PATH, date, camera, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "not found" });
  }

  fs.unlinkSync(filePath);

  // Remove from Nextcloud's index via WebDAV
  deleteFromNextcloud(`${date}/${camera}/${file}`);

  // Clean up empty parent directories
  const camDir = path.join(RECORDINGS_PATH, date, camera);
  if (fs.readdirSync(camDir).length === 0) {
    fs.rmdirSync(camDir);
    const dateDir = path.join(RECORDINGS_PATH, date);
    if (fs.readdirSync(dateDir).length === 0) {
      fs.rmdirSync(dateDir);
    }
  }

  res.json({ ok: true });
});

async function deleteFromNextcloud(clipPath) {
  if (!NEXTCLOUD_URL || !NEXTCLOUD_USER) return;
  const url = `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/Recordings/${clipPath}`;
  try {
    await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: "Basic " + Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASS}`).toString("base64"),
      },
    });
  } catch (e) {
    console.error("[nextcloud] failed to delete from Nextcloud:", e.message);
  }
}

export default router;

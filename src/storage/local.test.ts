import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { LocalStorageBackend } from "./local.js";

let tmpDir: string;
let storage: LocalStorageBackend;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-storage-"));
  storage = new LocalStorageBackend(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createTempFile(content = "test-data"): string {
  const filePath = path.join(os.tmpdir(), `ddd-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe("LocalStorageBackend", () => {
  describe("persist", () => {
    it("moves a file to the correct location", async () => {
      const src = createTempFile("hello");
      await storage.persist(src, "2024-01-15/Front_Door/14-30-00.mp4");

      const dest = path.join(tmpDir, "2024-01-15/Front_Door/14-30-00.mp4");
      expect(fs.existsSync(dest)).toBe(true);
      expect(fs.readFileSync(dest, "utf8")).toBe("hello");
      expect(fs.existsSync(src)).toBe(false);
    });

    it("creates nested directories as needed", async () => {
      const src = createTempFile();
      await storage.persist(src, "2024-06-01/Backyard_Cam/09-15-30.mp4");

      const dest = path.join(tmpDir, "2024-06-01/Backyard_Cam/09-15-30.mp4");
      expect(fs.existsSync(dest)).toBe(true);
    });
  });

  describe("list", () => {
    it("returns empty array when no recordings exist", async () => {
      const results = await storage.list();
      expect(results).toEqual([]);
    });

    it("lists recordings sorted by date descending", async () => {
      // Create two date directories with recordings
      const dir1 = path.join(tmpDir, "2024-01-15/Cam_A");
      const dir2 = path.join(tmpDir, "2024-01-16/Cam_A");
      fs.mkdirSync(dir1, { recursive: true });
      fs.mkdirSync(dir2, { recursive: true });
      fs.writeFileSync(path.join(dir1, "10-00-00.mp4"), "a");
      fs.writeFileSync(path.join(dir2, "11-00-00.mp4"), "b");

      const results = await storage.list();
      expect(results).toHaveLength(2);
      expect(results[0].date).toBe("2024-01-16");
      expect(results[1].date).toBe("2024-01-15");
    });

    it("only includes .mp4 files", async () => {
      const dir = path.join(tmpDir, "2024-01-15/Cam_A");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "10-00-00.mp4"), "video");
      fs.writeFileSync(path.join(dir, "10-00-00.jpg"), "image");

      const results = await storage.list();
      expect(results).toHaveLength(1);
      expect(results[0].file).toBe("10-00-00.mp4");
    });
  });

  describe("delete", () => {
    it("removes the file", async () => {
      const dir = path.join(tmpDir, "2024-01-15/Cam_A");
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, "10-00-00.mp4");
      fs.writeFileSync(filePath, "data");

      await storage.delete("2024-01-15/Cam_A/10-00-00.mp4");
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("cleans up empty parent directories", async () => {
      const dir = path.join(tmpDir, "2024-01-15/Cam_A");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "10-00-00.mp4"), "data");

      await storage.delete("2024-01-15/Cam_A/10-00-00.mp4");
      expect(fs.existsSync(path.join(tmpDir, "2024-01-15/Cam_A"))).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, "2024-01-15"))).toBe(false);
    });

    it("does nothing for non-existent files", async () => {
      await expect(storage.delete("2024-01-15/Cam/nope.mp4")).resolves.toBeUndefined();
    });
  });

  describe("deleteOlderThan", () => {
    it("removes directories older than cutoff date", async () => {
      const old = path.join(tmpDir, "2024-01-01/Cam");
      const keep = path.join(tmpDir, "2024-06-01/Cam");
      fs.mkdirSync(old, { recursive: true });
      fs.mkdirSync(keep, { recursive: true });
      fs.writeFileSync(path.join(old, "a.mp4"), "old");
      fs.writeFileSync(path.join(keep, "b.mp4"), "new");

      await storage.deleteOlderThan("2024-03-01");

      expect(fs.existsSync(path.join(tmpDir, "2024-01-01"))).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, "2024-06-01"))).toBe(true);
    });

    it("ignores non-date directories", async () => {
      const misc = path.join(tmpDir, "misc-folder");
      fs.mkdirSync(misc, { recursive: true });

      await storage.deleteOlderThan("2024-12-31");
      expect(fs.existsSync(misc)).toBe(true);
    });
  });
});

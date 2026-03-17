import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// Each test gets its own temp config dir via CONFIG_PATH
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-config-"));
  vi.stubEnv("CONFIG_PATH", tmpDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  // Clear module cache so next import re-reads config
  vi.resetModules();
});

async function loadStore() {
  return await import("./store.js");
}

describe("config/store", () => {
  it("returns default config when no config file exists", async () => {
    const store = await loadStore();
    const cfg = store.getConfig();
    expect(cfg.refreshToken).toBeNull();
    expect(cfg.cameras).toEqual({});
    expect(cfg.defaults).toEqual({
      recordingDuration: 120,
      cooldownSeconds: 20,
      retentionDays: 30,
    });
  });

  it("reads existing config file and merges with defaults", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ refreshToken: "tok123" }),
    );
    const store = await loadStore();
    const cfg = store.getConfig();
    expect(cfg.refreshToken).toBe("tok123");
    expect(cfg.defaults.recordingDuration).toBe(120);
  });

  it("getToken and setToken manage refresh token", async () => {
    const store = await loadStore();
    expect(store.getToken()).toBeNull();

    store.setToken("my-token");
    expect(store.getToken()).toBe("my-token");

    // Verify persisted to disk
    const raw = JSON.parse(fs.readFileSync(path.join(tmpDir, "config.json"), "utf8"));
    expect(raw.refreshToken).toBe("my-token");
  });

  it("updateConfig merges partial updates", async () => {
    const store = await loadStore();
    store.updateConfig({ defaults: { recordingDuration: 60, cooldownSeconds: 10, retentionDays: 7 } });
    const cfg = store.getConfig();
    expect(cfg.defaults.recordingDuration).toBe(60);
    expect(cfg.defaults.retentionDays).toBe(7);
  });

  it("getCameraConfig returns defaults when no camera-specific config", async () => {
    const store = await loadStore();
    const cfg = store.getCameraConfig("cam1");
    expect(cfg.enabled).toBe(true);
    expect(cfg.recordingDuration).toBe(120);
    expect(cfg.cooldownSeconds).toBe(20);
  });

  it("setCameraConfig persists per-camera overrides", async () => {
    const store = await loadStore();
    store.setCameraConfig("cam1", { recordingDuration: 30 });
    const cfg = store.getCameraConfig("cam1");
    expect(cfg.recordingDuration).toBe(30);
    expect(cfg.enabled).toBe(true);
  });
});

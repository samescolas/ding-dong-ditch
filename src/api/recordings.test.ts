import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";

// Mock the storage module
const mockStorage = {
  list: vi.fn(),
  serve: vi.fn(),
  delete: vi.fn(),
  persist: vi.fn(),
  deleteOlderThan: vi.fn(),
};

vi.mock("../storage/index.js", () => ({
  getStorage: () => mockStorage,
}));

import recordingsRouter from "./recordings.js";

// Build a minimal Express app for testing
function buildApp() {
  const app = express();
  app.use("/api/recordings", recordingsRouter);
  return app;
}

// Minimal supertest-like helper using native fetch (avoids extra dependency)
async function request(app: express.Express) {
  const { createServer } = await import("http");
  const server = createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as { port: number };
  const base = `http://127.0.0.1:${addr.port}`;

  const api = {
    async get(path: string) {
      const res = await fetch(`${base}${path}`);
      const body = await res.json().catch(() => null);
      server.close();
      return { status: res.status, body };
    },
    async delete(path: string) {
      const res = await fetch(`${base}${path}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      server.close();
      return { status: res.status, body };
    },
  };
  return api;
}

describe("recordings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET / lists recordings", async () => {
    const recordings = [
      { date: "2024-01-15", camera: "Cam", file: "10-00-00.mp4", path: "2024-01-15/Cam/10-00-00.mp4", size: 1024, created: new Date() },
    ];
    mockStorage.list.mockResolvedValue(recordings);

    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].camera).toBe("Cam");
  });

  it("GET / returns 500 on storage error", async () => {
    mockStorage.list.mockRejectedValue(new Error("disk full"));

    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("failed to list recordings");
  });

  it("rejects path traversal attempts with .. in path segments", async () => {
    const app = buildApp();
    // Express resolves /../ in the URL, so we use encoded dots in the segment itself
    const res = await (await request(app)).get("/api/recordings/2024-01-15/..cam/10-00-00.mp4");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid path");
  });

  it("rejects path traversal in delete", async () => {
    const app = buildApp();
    const res = await (await request(app)).delete("/api/recordings/2024-01-15/..%2F..%2Fetc/passwd");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid path");
  });

  it("DELETE removes a recording", async () => {
    mockStorage.delete.mockResolvedValue(undefined);

    const app = buildApp();
    const res = await (await request(app)).delete("/api/recordings/2024-01-15/Cam/10-00-00.mp4");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockStorage.delete).toHaveBeenCalledWith("2024-01-15/Cam/10-00-00.mp4");
  });
});

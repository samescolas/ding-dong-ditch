import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { initTestDb, closeDb } from "../db/index.js";
import { insertRecording } from "../db/recordings.js";

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
    initTestDb();
  });

  afterEach(() => {
    closeDb();
  });

  function seedRecordings() {
    insertRecording({
      camera: "Front_Door",
      date: "2024-01-15",
      timestamp: "2024-01-15T10:00:00",
      file: "10-00-00.mp4",
      path: "2024-01-15/Front_Door/10-00-00.mp4",
      size: 1024,
      description: "A person at the door",
    });
    insertRecording({
      camera: "Back_Yard",
      date: "2024-01-15",
      timestamp: "2024-01-15T11:00:00",
      file: "11-00-00.mp4",
      path: "2024-01-15/Back_Yard/11-00-00.mp4",
      size: 2048,
      description: "Cat in the yard",
    });
    insertRecording({
      camera: "Front_Door",
      date: "2024-01-16",
      timestamp: "2024-01-16T09:00:00",
      file: "09-00-00.mp4",
      path: "2024-01-16/Front_Door/09-00-00.mp4",
      size: 512,
    });
  }

  it("GET / returns paginated response", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("total", 3);
    expect(res.body).toHaveProperty("limit");
    expect(res.body).toHaveProperty("offset", 0);
    expect(res.body.data).toHaveLength(3);
  });

  it("GET / filters by camera", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings?camera=Front_Door");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.data.every((r: { camera: string }) => r.camera === "Front_Door")).toBe(true);
  });

  it("GET / filters by date range", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings?dateFrom=2024-01-16&dateTo=2024-01-16");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].date).toBe("2024-01-16");
  });

  it("GET / supports FTS search", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings?search=person");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].description).toContain("person");
  });

  it("GET / supports pagination", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings?limit=2&offset=0");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(0);
  });

  it("GET /cameras returns distinct camera names", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings/cameras");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(["Back_Yard", "Front_Door"]);
  });

  it("rejects path traversal attempts with .. in path segments", async () => {
    const app = buildApp();
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

  it("DELETE removes recording from storage and DB", async () => {
    seedRecordings();
    mockStorage.delete.mockResolvedValue(undefined);

    const app = buildApp();
    const res = await (await request(app)).delete("/api/recordings/2024-01-15/Front_Door/10-00-00.mp4");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockStorage.delete).toHaveBeenCalledWith("2024-01-15/Front_Door/10-00-00.mp4");
  });

  it("GET / returns empty results when no recordings exist", async () => {
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});

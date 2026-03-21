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
  app.use(express.json());
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
    async post(path: string, data: unknown) {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
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
      event_type: "doorbell",
    });
    insertRecording({
      camera: "Back_Yard",
      date: "2024-01-15",
      timestamp: "2024-01-15T11:00:00",
      file: "11-00-00.mp4",
      path: "2024-01-15/Back_Yard/11-00-00.mp4",
      size: 2048,
      description: "Cat in the yard",
      event_type: "motion",
    });
    insertRecording({
      camera: "Front_Door",
      date: "2024-01-16",
      timestamp: "2024-01-16T09:00:00",
      file: "09-00-00.mp4",
      path: "2024-01-16/Front_Door/09-00-00.mp4",
      size: 512,
      snapshot_key: "2024-01-16/Front_Door/09-00-00.jpg",
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

  it("GET serves camera names with spaces", async () => {
    // Serve mock must end the response or fetch will hang
    mockStorage.serve.mockImplementation((_key: string, res: express.Response) => {
      res.end();
      return Promise.resolve();
    });
    const app = buildApp();
    // URL-encode the space so the path is a valid URL
    const res = await (await request(app)).get("/api/recordings/2024-01-15/Front%20Door/10-00-00.mp4");

    expect(res.status).not.toBe(400);
    expect(mockStorage.serve).toHaveBeenCalledWith("2024-01-15/Front Door/10-00-00.mp4", expect.anything());
  });

  it("POST /bulk-delete accepts camera names with spaces", async () => {
    insertRecording({
      camera: "Front Door",
      date: "2024-01-15",
      timestamp: "2024-01-15T10:00:00",
      file: "10-00-00.mp4",
      path: "2024-01-15/Front Door/10-00-00.mp4",
      size: 1024,
    });
    mockStorage.delete.mockResolvedValue(undefined);
    const app = buildApp();
    const res = await (await request(app)).post("/api/recordings/bulk-delete", {
      paths: ["2024-01-15/Front Door/10-00-00.mp4"],
    });

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1);
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

  it("DELETE succeeds for recording with NULL description (backfilled)", async () => {
    insertRecording({
      camera: "Front_Door",
      date: "2024-01-15",
      timestamp: "2024-01-15T12:00:00",
      file: "12-00-00.mp4",
      path: "2024-01-15/Front_Door/12-00-00.mp4",
      size: 512,
      // no description — simulates a backfilled recording
    });
    mockStorage.delete.mockResolvedValue(undefined);

    const app = buildApp();
    const res = await (await request(app)).delete("/api/recordings/2024-01-15/Front_Door/12-00-00.mp4");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("GET / filters by eventType", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings?eventType=doorbell");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].event_type).toBe("doorbell");
    expect(res.body.data[0].camera).toBe("Front_Door");
  });

  it("GET / includes event_type in response data", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings");

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty("event_type");
  });

  it("GET / clamps limit to 100 when a larger value is requested", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings?limit=9999");

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
  });

  it("GET / rejects paths with invalid date format", async () => {
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings/not-a-date/Front_Door/10-00-00.mp4");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid path");
  });

  it("GET / rejects paths with invalid file format", async () => {
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings/2024-01-15/Front_Door/passwd");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid path");
  });

  it("GET / returns empty results when no recordings exist", async () => {
    const app = buildApp();
    const res = await (await request(app)).get("/api/recordings");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it("DELETE also removes the snapshot when snapshot_key is present", async () => {
    // seedRecordings seeds "2024-01-16/Front_Door/09-00-00.mp4" with snapshot_key "2024-01-16/Front_Door/09-00-00.jpg"
    seedRecordings();
    mockStorage.delete.mockResolvedValue(undefined);

    const app = buildApp();
    const res = await (await request(app)).delete("/api/recordings/2024-01-16/Front_Door/09-00-00.mp4");

    expect(res.status).toBe(200);
    expect(mockStorage.delete).toHaveBeenCalledWith("2024-01-16/Front_Door/09-00-00.mp4");
    expect(mockStorage.delete).toHaveBeenCalledWith("2024-01-16/Front_Door/09-00-00.jpg");
    expect(mockStorage.delete).toHaveBeenCalledTimes(2);
  });

  it("DELETE only calls storage.delete once when no snapshot_key", async () => {
    // seedRecordings seeds "2024-01-15/Front_Door/10-00-00.mp4" with no snapshot_key
    seedRecordings();
    mockStorage.delete.mockResolvedValue(undefined);

    const app = buildApp();
    const res = await (await request(app)).delete("/api/recordings/2024-01-15/Front_Door/10-00-00.mp4");

    expect(res.status).toBe(200);
    expect(mockStorage.delete).toHaveBeenCalledTimes(1);
    expect(mockStorage.delete).toHaveBeenCalledWith("2024-01-15/Front_Door/10-00-00.mp4");
  });

  it("POST /bulk-delete deletes multiple recordings and their snapshots", async () => {
    // seedRecordings has 3 recordings; "2024-01-16/Front_Door/09-00-00.mp4" has a snapshot_key
    seedRecordings();
    mockStorage.delete.mockResolvedValue(undefined);

    const app = buildApp();
    const res = await (await request(app)).post("/api/recordings/bulk-delete", {
      paths: [
        "2024-01-15/Front_Door/10-00-00.mp4",    // no snapshot
        "2024-01-16/Front_Door/09-00-00.mp4",    // has snapshot
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(2);
    expect(res.body.errors).toBe(0);
    // 3 storage.delete calls: mp4 #1, mp4 #2, jpg #2 (snapshot)
    expect(mockStorage.delete).toHaveBeenCalledTimes(3);
  });

  it("POST /bulk-delete rejects paths that fail allowlist validation", async () => {
    const app = buildApp();
    const res = await (await request(app)).post("/api/recordings/bulk-delete", {
      paths: ["2024-01-15/Front_Door/not-a-valid-file"],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid path");
  });

  it("POST /bulk-delete rejects path traversal", async () => {
    const app = buildApp();
    const res = await (await request(app)).post("/api/recordings/bulk-delete", {
      paths: ["2024-01-15/../etc/passwd"],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid path");
  });

  it("POST /bulk-delete rejects empty paths array", async () => {
    const app = buildApp();
    const res = await (await request(app)).post("/api/recordings/bulk-delete", {
      paths: [],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("paths must be a non-empty array");
  });

  it("POST /bulk-delete rejects missing paths", async () => {
    const app = buildApp();
    const res = await (await request(app)).post("/api/recordings/bulk-delete", {});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("paths must be a non-empty array");
  });

  // --- Timeline endpoint ---

  it("GET /timeline returns timeline recordings for a camera and time range", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/timeline?camera=Front_Door&from=2024-01-15T00:00:00&to=2024-01-16T23:59:59"
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    // Verify lightweight shape
    for (const rec of res.body) {
      expect(rec).toHaveProperty("id");
      expect(rec).toHaveProperty("timestamp");
      expect(rec).toHaveProperty("event_type");
      expect(rec).toHaveProperty("snapshot_key");
      expect(rec).toHaveProperty("path");
      expect(rec).not.toHaveProperty("description");
      expect(rec).not.toHaveProperty("size");
    }
  });

  it("GET /timeline returns 400 when camera is missing", async () => {
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/timeline?from=2024-01-15T00:00:00&to=2024-01-16T23:59:59"
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("camera, from, and to are required");
  });

  it("GET /timeline returns 400 when from is missing", async () => {
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/timeline?camera=Front_Door&to=2024-01-16T23:59:59"
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("camera, from, and to are required");
  });

  it("GET /timeline returns 400 when to is missing", async () => {
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/timeline?camera=Front_Door&from=2024-01-15T00:00:00"
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("camera, from, and to are required");
  });

  it("GET /timeline filters by eventType", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/timeline?camera=Front_Door&from=2024-01-15T00:00:00&to=2024-01-16T23:59:59&eventType=doorbell"
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].event_type).toBe("doorbell");
  });

  it("GET /timeline returns empty array when no recordings match", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/timeline?camera=Nonexistent&from=2024-01-15T00:00:00&to=2024-01-16T23:59:59"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /timeline handles very large time range", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/timeline?camera=Front_Door&from=2000-01-01T00:00:00&to=2099-12-31T23:59:59"
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("GET /timeline handles single-second time range", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/timeline?camera=Front_Door&from=2024-01-15T10:00:00&to=2024-01-15T10:00:00"
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].event_type).toBe("doorbell");
  });

  it("GET /timeline handles camera names with special characters", async () => {
    insertRecording({
      camera: "Front Door (Main)",
      date: "2024-01-15",
      timestamp: "2024-01-15T10:30:00",
      file: "10-30-00.mp4",
      path: "2024-01-15/Front Door (Main)/10-30-00.mp4",
      size: 512,
      event_type: "motion",
    });
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/timeline?camera=Front%20Door%20(Main)&from=2024-01-15T00:00:00&to=2024-01-15T23:59:59"
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET /timeline filters motion-only recordings", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/timeline?camera=Back_Yard&from=2024-01-15T00:00:00&to=2024-01-15T23:59:59&eventType=motion"
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].event_type).toBe("motion");
  });

  // --- Counts endpoint ---

  it("GET /counts returns counts for a camera and time range", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/counts?camera=Front_Door&from=2024-01-15T00:00:00&to=2024-01-16T23:59:59"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ motion: 1, doorbell: 1, total: 2 });
  });

  it("GET /counts returns 400 when camera is missing", async () => {
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/counts?from=2024-01-15T00:00:00&to=2024-01-16T23:59:59"
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("camera, from, and to query parameters are required");
  });

  it("GET /counts returns 400 when from is missing", async () => {
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/counts?camera=Front_Door&to=2024-01-16T23:59:59"
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("camera, from, and to query parameters are required");
  });

  it("GET /counts returns 400 when to is missing", async () => {
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/counts?camera=Front_Door&from=2024-01-15T00:00:00"
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("camera, from, and to query parameters are required");
  });

  it("GET /counts returns zeros when no recordings match", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/counts?camera=Nonexistent&from=2024-01-15T00:00:00&to=2024-01-16T23:59:59"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ motion: 0, doorbell: 0, total: 0 });
  });

  it("GET /counts handles very large time range", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/counts?camera=Front_Door&from=2000-01-01T00:00:00&to=2099-12-31T23:59:59"
    );

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.doorbell).toBe(1);
    expect(res.body.motion).toBe(1);
  });

  it("GET /counts handles single-second time range", async () => {
    seedRecordings();
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/counts?camera=Front_Door&from=2024-01-15T10:00:00&to=2024-01-15T10:00:00"
    );

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.doorbell).toBe(1);
  });

  it("GET /counts handles camera names with special characters", async () => {
    insertRecording({
      camera: "Front Door (Main)",
      date: "2024-01-15",
      timestamp: "2024-01-15T10:30:00",
      file: "10-30-00.mp4",
      path: "2024-01-15/Front Door (Main)/10-30-00.mp4",
      size: 512,
      event_type: "doorbell",
    });
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/counts?camera=Front%20Door%20(Main)&from=2024-01-15T00:00:00&to=2024-01-15T23:59:59"
    );

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.doorbell).toBe(1);
  });

  it("GET /counts returns zeros on empty database", async () => {
    const app = buildApp();
    const res = await (await request(app)).get(
      "/api/recordings/counts?camera=Front_Door&from=2024-01-15T00:00:00&to=2024-01-15T23:59:59"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ motion: 0, doorbell: 0, total: 0 });
  });

  it("POST /bulk-delete rejects more than 500 paths", async () => {
    const app = buildApp();
    const paths = Array.from({ length: 501 }, (_, i) =>
      `2024-01-15/Front_Door/${String(i).padStart(2, "0")}-00-00.mp4`
    );
    const res = await (await request(app)).post("/api/recordings/bulk-delete", { paths });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("too many paths (max 500)");
  });
});

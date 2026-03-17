import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initTestDb, closeDb } from "./index.js";
import {
  insertRecording,
  queryRecordings,
  deleteRecordingByPath,
  deleteRecordingsOlderThan,
  getDistinctCameras,
  backfillFromStorage,
} from "./recordings.js";

describe("recordings DB", () => {
  beforeEach(() => {
    initTestDb();
  });

  afterEach(() => {
    closeDb();
  });

  function seed() {
    insertRecording({
      camera: "Front_Door",
      date: "2024-01-15",
      timestamp: "2024-01-15T10:00:00",
      file: "10-00-00.mp4",
      path: "2024-01-15/Front_Door/10-00-00.mp4",
      size: 1024,
      description: "A person approaching the front door",
    });
    insertRecording({
      camera: "Back_Yard",
      date: "2024-01-15",
      timestamp: "2024-01-15T11:00:00",
      file: "11-00-00.mp4",
      path: "2024-01-15/Back_Yard/11-00-00.mp4",
      size: 2048,
      description: "Cat walking across the yard",
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

  it("inserts and queries recordings", () => {
    seed();
    const result = queryRecordings();
    expect(result.total).toBe(3);
    expect(result.data).toHaveLength(3);
    // Ordered by date DESC, file DESC
    expect(result.data[0].date).toBe("2024-01-16");
    expect(result.data[1].date).toBe("2024-01-15");
  });

  it("INSERT OR IGNORE handles duplicates", () => {
    seed();
    // Insert same path again — should be ignored
    insertRecording({
      camera: "Front_Door",
      date: "2024-01-15",
      timestamp: "2024-01-15T10:00:00",
      file: "10-00-00.mp4",
      path: "2024-01-15/Front_Door/10-00-00.mp4",
      size: 9999,
    });
    expect(queryRecordings().total).toBe(3);
  });

  it("filters by camera", () => {
    seed();
    const result = queryRecordings({ camera: "Front_Door" });
    expect(result.total).toBe(2);
    expect(result.data.every((r) => r.camera === "Front_Door")).toBe(true);
  });

  it("filters by date range", () => {
    seed();
    const result = queryRecordings({ dateFrom: "2024-01-16", dateTo: "2024-01-16" });
    expect(result.total).toBe(1);
    expect(result.data[0].date).toBe("2024-01-16");
  });

  it("supports FTS search on description", () => {
    seed();
    const result = queryRecordings({ search: "person" });
    expect(result.total).toBe(1);
    expect(result.data[0].camera).toBe("Front_Door");
    expect(result.data[0].description).toContain("person");
  });

  it("supports pagination", () => {
    seed();
    const page1 = queryRecordings({ limit: 2, offset: 0 });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(3);
    expect(page1.limit).toBe(2);
    expect(page1.offset).toBe(0);

    const page2 = queryRecordings({ limit: 2, offset: 2 });
    expect(page2.data).toHaveLength(1);
    expect(page2.total).toBe(3);
  });

  it("deletes by path", () => {
    seed();
    deleteRecordingByPath("2024-01-15/Front_Door/10-00-00.mp4");
    expect(queryRecordings().total).toBe(2);
  });

  it("deletes recordings older than cutoff", () => {
    seed();
    const count = deleteRecordingsOlderThan("2024-01-16");
    expect(count).toBe(2);
    expect(queryRecordings().total).toBe(1);
  });

  it("returns distinct cameras", () => {
    seed();
    const cameras = getDistinctCameras();
    expect(cameras).toEqual(["Back_Yard", "Front_Door"]);
  });

  it("backfills from storage data", () => {
    const storageData = [
      { camera: "Cam1", date: "2024-02-01", file: "12-00-00.mp4", path: "2024-02-01/Cam1/12-00-00.mp4", size: 100 },
      { camera: "Cam2", date: "2024-02-01", file: "13-00-00.mp4", path: "2024-02-01/Cam2/13-00-00.mp4", size: 200 },
    ];
    const count = backfillFromStorage(storageData);
    expect(count).toBe(2);
    expect(queryRecordings().total).toBe(2);

    // Re-backfill is idempotent
    const count2 = backfillFromStorage(storageData);
    expect(count2).toBe(0);
    expect(queryRecordings().total).toBe(2);
  });

  it("stores and retrieves snapshot_key", () => {
    seed();
    const result = queryRecordings({ camera: "Front_Door", dateFrom: "2024-01-16" });
    expect(result.data[0].snapshot_key).toBe("2024-01-16/Front_Door/09-00-00.jpg");
  });

  it("returns empty results for no matches", () => {
    const result = queryRecordings();
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

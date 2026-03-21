import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initTestDb, closeDb } from "./index.js";
import {
  insertRecording,
  queryRecordings,
  queryTimelineRecordings,
  countRecordingsByType,
  deleteRecordingByPath,
  deleteRecordingsOlderThan,
  getDistinctCameras,
  getRecordingByPath,
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
      event_type: "doorbell",
    });
    insertRecording({
      camera: "Back_Yard",
      date: "2024-01-15",
      timestamp: "2024-01-15T11:00:00",
      file: "11-00-00.mp4",
      path: "2024-01-15/Back_Yard/11-00-00.mp4",
      size: 2048,
      description: "Cat walking across the yard",
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
      // no event_type — should default to 'motion'
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

  it("stores and retrieves snapshot_key", () => {
    seed();
    const result = queryRecordings({ camera: "Front_Door", dateFrom: "2024-01-16" });
    expect(result.data[0].snapshot_key).toBe("2024-01-16/Front_Door/09-00-00.jpg");
  });

  it("stores and retrieves event_type", () => {
    seed();
    const result = queryRecordings({ camera: "Front_Door", dateFrom: "2024-01-15", dateTo: "2024-01-15" });
    expect(result.data[0].event_type).toBe("doorbell");
  });

  it("defaults event_type to motion when not specified", () => {
    seed();
    const result = queryRecordings({ camera: "Front_Door", dateFrom: "2024-01-16" });
    expect(result.data[0].event_type).toBe("motion");
  });

  it("filters by eventType doorbell", () => {
    seed();
    const result = queryRecordings({ eventType: "doorbell" });
    expect(result.total).toBe(1);
    expect(result.data[0].event_type).toBe("doorbell");
    expect(result.data[0].camera).toBe("Front_Door");
  });

  it("filters by eventType motion", () => {
    seed();
    const result = queryRecordings({ eventType: "motion" });
    expect(result.total).toBe(2);
    expect(result.data.every((r) => r.event_type === "motion")).toBe(true);
  });

  it("returns empty results for no matches", () => {
    const result = queryRecordings();
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("getRecordingByPath returns the correct row", () => {
    seed();
    const rec = getRecordingByPath("2024-01-16/Front_Door/09-00-00.mp4");
    expect(rec).not.toBeNull();
    expect(rec!.camera).toBe("Front_Door");
    expect(rec!.date).toBe("2024-01-16");
    expect(rec!.snapshot_key).toBe("2024-01-16/Front_Door/09-00-00.jpg");
  });

  it("getRecordingByPath returns null for unknown path", () => {
    seed();
    const rec = getRecordingByPath("does/not/exist.mp4");
    expect(rec).toBeNull();
  });

  describe("queryTimelineRecordings", () => {
    it("returns lightweight fields ordered by timestamp ASC", () => {
      seed();
      const results = queryTimelineRecordings("Front_Door", "2024-01-01T00:00:00", "2024-12-31T23:59:59");
      expect(results).toHaveLength(2);
      // ASC order
      expect(results[0].timestamp).toBe("2024-01-15T10:00:00");
      expect(results[1].timestamp).toBe("2024-01-16T09:00:00");
      // Only lightweight fields
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("timestamp");
      expect(results[0]).toHaveProperty("event_type");
      expect(results[0]).toHaveProperty("snapshot_key");
      expect(results[0]).toHaveProperty("path");
      expect(results[0]).not.toHaveProperty("description");
      expect(results[0]).not.toHaveProperty("size");
    });

    it("filters by eventType", () => {
      seed();
      const doorbells = queryTimelineRecordings("Front_Door", "2024-01-01T00:00:00", "2024-12-31T23:59:59", "doorbell");
      expect(doorbells).toHaveLength(1);
      expect(doorbells[0].event_type).toBe("doorbell");

      const motions = queryTimelineRecordings("Front_Door", "2024-01-01T00:00:00", "2024-12-31T23:59:59", "motion");
      expect(motions).toHaveLength(1);
      expect(motions[0].event_type).toBe("motion");
    });

    it("returns empty array for no matches", () => {
      seed();
      const results = queryTimelineRecordings("Nonexistent", "2024-01-01T00:00:00", "2024-12-31T23:59:59");
      expect(results).toEqual([]);
    });

    it("respects time range boundaries", () => {
      seed();
      const results = queryTimelineRecordings("Front_Door", "2024-01-16T00:00:00", "2024-01-16T23:59:59");
      expect(results).toHaveLength(1);
      expect(results[0].timestamp).toBe("2024-01-16T09:00:00");
    });
  });

  describe("countRecordingsByType", () => {
    it("returns correct counts for all types", () => {
      seed();
      const counts = countRecordingsByType("Front_Door", "2024-01-01T00:00:00", "2024-12-31T23:59:59");
      expect(counts.total).toBe(2);
      expect(counts.doorbell).toBe(1);
      expect(counts.motion).toBe(1);
    });

    it("returns zeros for no matches", () => {
      seed();
      const counts = countRecordingsByType("Nonexistent", "2024-01-01T00:00:00", "2024-12-31T23:59:59");
      expect(counts.total).toBe(0);
      expect(counts.motion).toBe(0);
      expect(counts.doorbell).toBe(0);
    });

    it("respects time range", () => {
      seed();
      const counts = countRecordingsByType("Front_Door", "2024-01-16T00:00:00", "2024-01-16T23:59:59");
      expect(counts.total).toBe(1);
      expect(counts.motion).toBe(1);
      expect(counts.doorbell).toBe(0);
    });

    it("counts across cameras correctly", () => {
      seed();
      const counts = countRecordingsByType("Back_Yard", "2024-01-01T00:00:00", "2024-12-31T23:59:59");
      expect(counts.total).toBe(1);
      expect(counts.motion).toBe(1);
      expect(counts.doorbell).toBe(0);
    });
  });
});

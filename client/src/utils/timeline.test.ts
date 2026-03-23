import { describe, it, expect } from "vitest";
import { findLatestRecording } from "./timeline";
import type { TimelineRecording } from "../components/timeline/TimelineBar";

function makeRecording(
  overrides: Partial<TimelineRecording> & { timestamp: string },
): TimelineRecording {
  return {
    id: 1,
    event_type: "motion",
    snapshot_key: null,
    path: "/recordings/test.mp4",
    ...overrides,
  };
}

describe("findLatestRecording", () => {
  it("returns null when recordings array is empty", () => {
    expect(findLatestRecording([])).toBeNull();
  });

  it("returns the single recording when array has one element", () => {
    const rec = makeRecording({ id: 1, timestamp: "2026-03-23T10:00:00Z" });
    expect(findLatestRecording([rec])).toBe(rec);
  });

  it("returns the recording with the highest timestamp", () => {
    const older = makeRecording({ id: 1, timestamp: "2026-03-22T08:00:00Z" });
    const newest = makeRecording({ id: 2, timestamp: "2026-03-23T12:00:00Z" });
    const middle = makeRecording({ id: 3, timestamp: "2026-03-23T06:00:00Z" });

    expect(findLatestRecording([older, newest, middle])).toBe(newest);
  });

  it("returns the first occurrence when multiple recordings share the same latest timestamp", () => {
    const a = makeRecording({ id: 1, timestamp: "2026-03-23T12:00:00Z" });
    const b = makeRecording({ id: 2, timestamp: "2026-03-23T12:00:00Z" });

    expect(findLatestRecording([a, b])).toBe(a);
  });
});

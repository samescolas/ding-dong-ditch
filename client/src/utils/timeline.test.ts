import { describe, it, expect } from "vitest";
import { findLatestRecording, resolveAutoJump } from "./timeline.js";
import type { TimelineRecording } from "../types/timeline.js";

function makeRecording(overrides: Partial<TimelineRecording> & { id: number; timestamp: string }): TimelineRecording {
  return {
    event_type: "motion",
    snapshot_key: null,
    path: `2025-01-01/front/${overrides.id}.mp4`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// findLatestRecording
// ---------------------------------------------------------------------------
describe("findLatestRecording", () => {
  it("returns null for an empty array", () => {
    expect(findLatestRecording([])).toBeNull();
  });

  it("returns the single recording when array has one element", () => {
    const rec = makeRecording({ id: 1, timestamp: "2025-06-01T10:00:00Z" });
    expect(findLatestRecording([rec])).toBe(rec);
  });

  it("returns the recording with the highest timestamp", () => {
    const older = makeRecording({ id: 1, timestamp: "2025-06-01T08:00:00Z" });
    const newest = makeRecording({ id: 2, timestamp: "2025-06-01T12:00:00Z" });
    const middle = makeRecording({ id: 3, timestamp: "2025-06-01T10:00:00Z" });

    expect(findLatestRecording([older, newest, middle])).toBe(newest);
  });

  it("handles recordings with identical timestamps by returning the first encountered", () => {
    const a = makeRecording({ id: 1, timestamp: "2025-06-01T10:00:00Z" });
    const b = makeRecording({ id: 2, timestamp: "2025-06-01T10:00:00Z" });

    expect(findLatestRecording([a, b])).toBe(a);
  });

  it("skips recordings with invalid timestamps", () => {
    const valid = makeRecording({ id: 1, timestamp: "2025-06-01T10:00:00Z" });
    const invalid = makeRecording({ id: 2, timestamp: "not-a-date" });

    expect(findLatestRecording([invalid, valid])).toBe(valid);
  });

  it("returns null when all timestamps are invalid", () => {
    const a = makeRecording({ id: 1, timestamp: "bad" });
    const b = makeRecording({ id: 2, timestamp: "" });

    expect(findLatestRecording([a, b])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveAutoJump
// ---------------------------------------------------------------------------
describe("resolveAutoJump", () => {
  const rec1 = makeRecording({ id: 1, timestamp: "2025-06-01T08:00:00Z" });
  const rec2 = makeRecording({ id: 2, timestamp: "2025-06-01T12:00:00Z" });
  const rec3 = makeRecording({ id: 3, timestamp: "2025-06-01T10:00:00Z" });

  it("selects the latest recording on first load", () => {
    const result = resolveAutoJump([rec1, rec2, rec3], null, false);

    expect(result.selected).toBe(rec2);
    expect(result.shouldMarkJumped).toBe(true);
  });

  it("does not re-trigger after initial auto-jump (filter change scenario)", () => {
    // User has already auto-jumped and now changes a filter
    const result = resolveAutoJump([rec1, rec3], rec2, true);

    expect(result.selected).toBe(rec2); // keeps current selection
    expect(result.shouldMarkJumped).toBe(false);
  });

  it("returns null selection for empty recordings on first load", () => {
    const result = resolveAutoJump([], null, false);

    expect(result.selected).toBeNull();
    expect(result.shouldMarkJumped).toBe(false);
  });

  it("preserves null selection on subsequent calls with empty data", () => {
    const result = resolveAutoJump([], null, true);

    expect(result.selected).toBeNull();
    expect(result.shouldMarkJumped).toBe(false);
  });

  it("does not override user selection after auto-jump even with new data", () => {
    // User manually selected rec1, new data arrives with rec2 as latest
    const result = resolveAutoJump([rec1, rec2, rec3], rec1, true);

    expect(result.selected).toBe(rec1); // user's choice preserved
    expect(result.shouldMarkJumped).toBe(false);
  });

  it("handles first load with all invalid timestamps gracefully", () => {
    const bad1 = makeRecording({ id: 10, timestamp: "invalid" });
    const bad2 = makeRecording({ id: 11, timestamp: "" });
    const result = resolveAutoJump([bad1, bad2], null, false);

    expect(result.selected).toBeNull();
    expect(result.shouldMarkJumped).toBe(false);
  });
});

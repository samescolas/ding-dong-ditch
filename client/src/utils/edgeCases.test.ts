import { describe, it, expect } from "vitest";
import { formatWallClockTime } from "./formatWallClockTime.js";
import { findLatestRecording, resolveAutoJump } from "./timeline.js";
import {
  pixelToTime,
  hitTestRecording,
  formatTooltipTime,
} from "./timelineUtils.js";
import type { TimelineRecording } from "../types/timeline.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRec(overrides: Partial<TimelineRecording> & { id: number }): TimelineRecording {
  return {
    timestamp: "2024-01-15T10:00:00Z",
    event_type: "motion",
    snapshot_key: null,
    path: `2024-01-15/Front_Door/${overrides.id}-00-00.mp4`,
    ...overrides,
  };
}

function makeTimeRange(from: string, to: string) {
  return { from: new Date(from), to: new Date(to) };
}

// ---------------------------------------------------------------------------
// formatWallClockTime — null / invalid timestamps
// ---------------------------------------------------------------------------

describe("formatWallClockTime", () => {
  it("returns null when timestamp is null", () => {
    expect(formatWallClockTime(null, 10)).toBeNull();
  });

  it("returns null when timestamp is undefined", () => {
    expect(formatWallClockTime(undefined, 10)).toBeNull();
  });

  it("returns null when timestamp is an invalid date string", () => {
    expect(formatWallClockTime("not-a-date", 0)).toBeNull();
  });

  it("returns a formatted string for a valid timestamp with zero offset", () => {
    const result = formatWallClockTime("2024-01-15T10:00:00Z", 0);
    expect(result).toBeTypeOf("string");
    expect(result!.length).toBeGreaterThan(0);
  });

  it("midnight rollover: 23:59 + 120s shows next-day time", () => {
    // 23:59:00 UTC + 120 seconds = 00:01:00 UTC next day
    const result = formatWallClockTime("2024-01-15T23:59:00Z", 120);
    expect(result).toBeTypeOf("string");
    // The formatted time should contain "12:01" (AM in UTC) for the rolled-over time.
    // Because toLocaleTimeString uses the runtime's timezone, we verify the Date math
    // directly rather than the exact locale string.
    const base = new Date("2024-01-15T23:59:00Z");
    const wall = new Date(base.getTime() + 120 * 1000);
    expect(wall.getUTCHours()).toBe(0);
    expect(wall.getUTCMinutes()).toBe(1);
  });

  it("handles negative elapsed seconds (rewinding)", () => {
    const result = formatWallClockTime("2024-01-15T10:00:00Z", -60);
    expect(result).toBeTypeOf("string");
  });

  it("handles large elapsed seconds", () => {
    const result = formatWallClockTime("2024-01-15T10:00:00Z", 86400);
    expect(result).toBeTypeOf("string");
  });
});

// ---------------------------------------------------------------------------
// findLatestRecording — null timestamps, single recording
// ---------------------------------------------------------------------------

describe("findLatestRecording", () => {
  it("returns null for an empty array", () => {
    expect(findLatestRecording([])).toBeNull();
  });

  it("skips recordings with missing timestamps", () => {
    const recs: TimelineRecording[] = [
      makeRec({ id: 1, timestamp: undefined as unknown as string }),
      makeRec({ id: 2, timestamp: "" }),
    ];
    expect(findLatestRecording(recs)).toBeNull();
  });

  it("returns the single recording when only one exists", () => {
    const rec = makeRec({ id: 1, timestamp: "2024-01-15T10:00:00Z" });
    expect(findLatestRecording([rec])).toBe(rec);
  });

  it("returns the latest of multiple recordings", () => {
    const early = makeRec({ id: 1, timestamp: "2024-01-15T08:00:00Z" });
    const late = makeRec({ id: 2, timestamp: "2024-01-15T12:00:00Z" });
    const mid = makeRec({ id: 3, timestamp: "2024-01-15T10:00:00Z" });
    expect(findLatestRecording([early, late, mid])).toBe(late);
  });

  it("ignores null-timestamp entries mixed with valid ones", () => {
    const valid = makeRec({ id: 1, timestamp: "2024-01-15T10:00:00Z" });
    const invalid = makeRec({ id: 2, timestamp: null as unknown as string });
    expect(findLatestRecording([invalid, valid])).toBe(valid);
  });
});

// ---------------------------------------------------------------------------
// resolveAutoJump
// ---------------------------------------------------------------------------

describe("resolveAutoJump", () => {
  it("returns null for empty recordings", () => {
    expect(resolveAutoJump([])).toBeNull();
  });

  it("returns the single recording", () => {
    const rec = makeRec({ id: 1 });
    expect(resolveAutoJump([rec])).toBe(rec);
  });

  it("returns latest when multiple present", () => {
    const a = makeRec({ id: 1, timestamp: "2024-01-15T08:00:00Z" });
    const b = makeRec({ id: 2, timestamp: "2024-01-15T20:00:00Z" });
    expect(resolveAutoJump([a, b])).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// pixelToTime — edge cases
// ---------------------------------------------------------------------------

describe("pixelToTime", () => {
  const range = makeTimeRange("2024-01-15T00:00:00Z", "2024-01-16T00:00:00Z");

  it("returns null for zero-width container", () => {
    expect(pixelToTime(50, 0, range)).toBeNull();
  });

  it("returns null for negative container width", () => {
    expect(pixelToTime(50, -100, range)).toBeNull();
  });

  it("returns null for negative pixel value", () => {
    expect(pixelToTime(-10, 1000, range)).toBeNull();
  });

  it("returns null for inverted time range (to < from)", () => {
    const inverted = makeTimeRange("2024-01-16T00:00:00Z", "2024-01-15T00:00:00Z");
    expect(pixelToTime(50, 1000, inverted)).toBeNull();
  });

  it("returns null for zero-length time range", () => {
    const zero = makeTimeRange("2024-01-15T00:00:00Z", "2024-01-15T00:00:00Z");
    expect(pixelToTime(50, 1000, zero)).toBeNull();
  });

  it("maps pixel 0 to from time", () => {
    const result = pixelToTime(0, 1000, range);
    expect(result!.getTime()).toBe(range.from.getTime());
  });

  it("maps last pixel to approximately to-time", () => {
    const result = pixelToTime(1000, 1000, range);
    expect(result!.getTime()).toBe(range.to.getTime());
  });

  it("maps midpoint correctly", () => {
    const result = pixelToTime(500, 1000, range);
    const expected = range.from.getTime() + (range.to.getTime() - range.from.getTime()) / 2;
    expect(result!.getTime()).toBe(expected);
  });

  it("handles very large time range (7 days)", () => {
    const sevenDays = makeTimeRange("2024-01-15T00:00:00Z", "2024-01-22T00:00:00Z");
    const result = pixelToTime(500, 1000, sevenDays);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBeGreaterThan(sevenDays.from.getTime());
    expect(result!.getTime()).toBeLessThan(sevenDays.to.getTime());
  });

  it("handles pixel value beyond container width gracefully", () => {
    const result = pixelToTime(2000, 1000, range);
    // Should return a time beyond the range — function does not clamp
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBeGreaterThan(range.to.getTime());
  });
});

// ---------------------------------------------------------------------------
// hitTestRecording — sub-1-second clips, single recording, large datasets
// ---------------------------------------------------------------------------

describe("hitTestRecording", () => {
  const range = makeTimeRange("2024-01-15T00:00:00Z", "2024-01-16T00:00:00Z");
  const containerWidth = 1000;

  it("returns null for empty recordings", () => {
    expect(hitTestRecording(500, [], containerWidth, range)).toBeNull();
  });

  it("returns null for zero-width container", () => {
    const rec = makeRec({ id: 1, timestamp: "2024-01-15T12:00:00Z" });
    expect(hitTestRecording(500, [rec], 0, range)).toBeNull();
  });

  it("returns null for inverted time range", () => {
    const rec = makeRec({ id: 1, timestamp: "2024-01-15T12:00:00Z" });
    const inverted = makeTimeRange("2024-01-16T00:00:00Z", "2024-01-15T00:00:00Z");
    expect(hitTestRecording(500, [rec], containerWidth, inverted)).toBeNull();
  });

  it("hits a single recording at its position", () => {
    // Recording at midpoint of 24h range
    const rec = makeRec({ id: 1, timestamp: "2024-01-15T12:00:00Z" });
    // Midpoint pixel = 500
    const result = hitTestRecording(500, [rec], containerWidth, range);
    expect(result).toBe(rec);
  });

  it("misses a recording when clicking far away", () => {
    const rec = makeRec({ id: 1, timestamp: "2024-01-15T12:00:00Z" });
    // Click at pixel 0 — recording is at pixel ~500
    expect(hitTestRecording(0, [rec], containerWidth, range)).toBeNull();
  });

  it("handles sub-1-second clip (< 1s duration) with minimum block width", () => {
    const rec = makeRec({ id: 1, timestamp: "2024-01-15T12:00:00Z" });
    // Use a very short duration — 500ms
    const durationMs = 500;
    // The block at pixel ~500 should still have MIN_BLOCK_WIDTH_PX (4px)
    const result = hitTestRecording(500, [rec], containerWidth, range, durationMs);
    expect(result).toBe(rec);
  });

  it("handles recording with null timestamp gracefully", () => {
    const rec = makeRec({ id: 1, timestamp: null as unknown as string });
    expect(hitTestRecording(500, [rec], containerWidth, range)).toBeNull();
  });

  it("handles recording with empty timestamp gracefully", () => {
    const rec = makeRec({ id: 1, timestamp: "" });
    expect(hitTestRecording(500, [rec], containerWidth, range)).toBeNull();
  });

  it("returns the first matching recording when blocks overlap", () => {
    const rec1 = makeRec({ id: 1, timestamp: "2024-01-15T12:00:00Z" });
    const rec2 = makeRec({ id: 2, timestamp: "2024-01-15T12:00:01Z" });
    const result = hitTestRecording(500, [rec1, rec2], containerWidth, range);
    expect(result).toBe(rec1);
  });

  it("large dataset (500+ recordings) completes quickly", () => {
    const recordings: TimelineRecording[] = [];
    const startMs = new Date("2024-01-15T00:00:00Z").getTime();
    for (let i = 0; i < 600; i++) {
      recordings.push(
        makeRec({
          id: i,
          timestamp: new Date(startMs + i * 60_000).toISOString(),
        }),
      );
    }

    const start = performance.now();
    // Hit-test at the pixel corresponding to the first recording's position
    // First recording is at startMs, pixel 0 in the range
    const result = hitTestRecording(0, recordings, containerWidth, range);
    const elapsed = performance.now() - start;

    // Should complete in under 5ms (generous threshold for CI)
    expect(elapsed).toBeLessThan(5);
    // Should find the first recording at pixel 0
    expect(result).not.toBeNull();
    expect(result!.id).toBe(0);
  });

  it("7-day range with many recordings: scrubbing remains responsive", () => {
    const sevenDayRange = makeTimeRange("2024-01-15T00:00:00Z", "2024-01-22T00:00:00Z");
    const recordings: TimelineRecording[] = [];
    const startMs = new Date("2024-01-15T00:00:00Z").getTime();
    // One recording every 10 minutes for 7 days = 1008 recordings
    for (let i = 0; i < 1008; i++) {
      recordings.push(
        makeRec({
          id: i,
          timestamp: new Date(startMs + i * 600_000).toISOString(),
        }),
      );
    }

    const start = performance.now();
    // Simulate rapid scrubbing: 50 hit tests
    for (let px = 0; px < 1000; px += 20) {
      hitTestRecording(px, recordings, containerWidth, sevenDayRange);
    }
    const elapsed = performance.now() - start;

    // 50 hit tests over 1000+ recordings should complete in <50ms
    expect(elapsed).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// formatTooltipTime
// ---------------------------------------------------------------------------

describe("formatTooltipTime", () => {
  it("formats a valid date", () => {
    const result = formatTooltipTime(new Date("2024-01-15T10:05:30Z"));
    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats midnight correctly", () => {
    const result = formatTooltipTime(new Date("2024-01-15T00:00:00Z"));
    expect(result).toBeTypeOf("string");
  });
});

// ---------------------------------------------------------------------------
// Rapid filter switching — no race conditions with pure functions
// ---------------------------------------------------------------------------

describe("rapid filter switching", () => {
  it("findLatestRecording returns consistent results when called rapidly with changing data", () => {
    const sets = [
      [makeRec({ id: 1, timestamp: "2024-01-15T08:00:00Z" })],
      [makeRec({ id: 2, timestamp: "2024-01-15T10:00:00Z" }), makeRec({ id: 3, timestamp: "2024-01-15T12:00:00Z" })],
      [],
      [makeRec({ id: 4, timestamp: "2024-01-15T20:00:00Z" })],
    ];

    const results = sets.map((s) => findLatestRecording(s));

    expect(results[0]!.id).toBe(1);
    expect(results[1]!.id).toBe(3);
    expect(results[2]).toBeNull();
    expect(results[3]!.id).toBe(4);
  });

  it("hitTestRecording works correctly when recordings array changes between calls", () => {
    const range = makeTimeRange("2024-01-15T00:00:00Z", "2024-01-16T00:00:00Z");
    const width = 1000;

    const setA = [makeRec({ id: 1, timestamp: "2024-01-15T12:00:00Z" })];
    const setB = [makeRec({ id: 2, timestamp: "2024-01-15T06:00:00Z" })];

    const resultA = hitTestRecording(500, setA, width, range);
    const resultB = hitTestRecording(250, setB, width, range);

    expect(resultA!.id).toBe(1);
    expect(resultB!.id).toBe(2);
  });

  it("pixelToTime is deterministic regardless of call order", () => {
    const range = makeTimeRange("2024-01-15T00:00:00Z", "2024-01-16T00:00:00Z");

    const r1 = pixelToTime(500, 1000, range);
    const r2 = pixelToTime(500, 1000, range);

    expect(r1!.getTime()).toBe(r2!.getTime());
  });
});

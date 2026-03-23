import { describe, it, expect } from "vitest";
import {
  pixelToTime,
  timeToPixel,
  hitTestRecording,
  DEFAULT_RECORDING_DURATION_MS,
} from "./timelineUtils";
import type { TimelineRecording } from "../types/timeline";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeRecording(id: number, timestampMs: number): TimelineRecording {
  return {
    id,
    timestamp: new Date(timestampMs).toISOString(),
    event_type: "motion",
    snapshot_key: null,
    path: `/recordings/${id}.mp4`,
  };
}

const BASE_TIME = new Date("2026-03-23T12:00:00Z").getTime();
const DURATION = DEFAULT_RECORDING_DURATION_MS; // 30 000 ms

/* ------------------------------------------------------------------ */
/*  pixelToTime / timeToPixel                                          */
/* ------------------------------------------------------------------ */

describe("pixelToTime", () => {
  const range = { from: new Date(BASE_TIME), to: new Date(BASE_TIME + 3600_000) };

  it("returns start of range for pixel 0", () => {
    expect(pixelToTime(0, 1000, range).getTime()).toBe(range.from.getTime());
  });

  it("returns end of range for pixel equal to container width", () => {
    expect(pixelToTime(1000, 1000, range).getTime()).toBe(range.to.getTime());
  });

  it("returns midpoint for half-width pixel", () => {
    const mid = pixelToTime(500, 1000, range);
    expect(mid.getTime()).toBe(BASE_TIME + 1800_000);
  });

  it("clamps below 0", () => {
    expect(pixelToTime(-50, 1000, range).getTime()).toBe(range.from.getTime());
  });

  it("clamps above container width", () => {
    expect(pixelToTime(1500, 1000, range).getTime()).toBe(range.to.getTime());
  });
});

describe("timeToPixel", () => {
  const range = { from: new Date(BASE_TIME), to: new Date(BASE_TIME + 3600_000) };

  it("returns 0 for the start of the range", () => {
    expect(timeToPixel(range.from, 1000, range)).toBe(0);
  });

  it("returns container width for the end of the range", () => {
    expect(timeToPixel(range.to, 1000, range)).toBe(1000);
  });

  it("returns 0 when range is zero-width", () => {
    const zeroRange = { from: new Date(BASE_TIME), to: new Date(BASE_TIME) };
    expect(timeToPixel(new Date(BASE_TIME), 1000, zeroRange)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  hitTestRecording                                                   */
/* ------------------------------------------------------------------ */

describe("hitTestRecording", () => {
  describe("empty array", () => {
    it("returns null", () => {
      expect(hitTestRecording(new Date(BASE_TIME), [])).toBeNull();
    });
  });

  describe("single recording", () => {
    const recordings = [makeRecording(1, BASE_TIME)];

    it("returns recording with offsetRatio 0 at exact start", () => {
      const result = hitTestRecording(new Date(BASE_TIME), recordings);
      expect(result).not.toBeNull();
      expect(result!.recording.id).toBe(1);
      expect(result!.offsetRatio).toBe(0);
    });

    it("returns recording with correct offsetRatio within duration", () => {
      const midTime = new Date(BASE_TIME + DURATION / 2);
      const result = hitTestRecording(midTime, recordings);
      expect(result).not.toBeNull();
      expect(result!.recording.id).toBe(1);
      expect(result!.offsetRatio).toBeCloseTo(0.5);
    });

    it("returns recording with offsetRatio 1 at exact end", () => {
      const endTime = new Date(BASE_TIME + DURATION);
      const result = hitTestRecording(endTime, recordings);
      expect(result).not.toBeNull();
      expect(result!.recording.id).toBe(1);
      expect(result!.offsetRatio).toBeCloseTo(1);
    });

    it("returns nearest (offsetRatio 0) for timestamp before recording", () => {
      const before = new Date(BASE_TIME - 60_000);
      const result = hitTestRecording(before, recordings);
      expect(result).not.toBeNull();
      expect(result!.recording.id).toBe(1);
      expect(result!.offsetRatio).toBe(0);
    });

    it("returns nearest (offsetRatio 0) for timestamp after recording", () => {
      const after = new Date(BASE_TIME + DURATION + 60_000);
      const result = hitTestRecording(after, recordings);
      expect(result).not.toBeNull();
      expect(result!.recording.id).toBe(1);
      expect(result!.offsetRatio).toBe(0);
    });
  });

  describe("multiple recordings with gaps", () => {
    // Recordings at: BASE, BASE+60s, BASE+120s (each 30s long)
    // Gap between rec1 end (BASE+30s) and rec2 start (BASE+60s): 30s
    // Gap between rec2 end (BASE+90s) and rec3 start (BASE+120s): 30s
    const recordings = [
      makeRecording(1, BASE_TIME),
      makeRecording(2, BASE_TIME + 60_000),
      makeRecording(3, BASE_TIME + 120_000),
    ];

    it("finds correct recording when clicking within first recording", () => {
      const result = hitTestRecording(new Date(BASE_TIME + 10_000), recordings);
      expect(result!.recording.id).toBe(1);
      expect(result!.offsetRatio).toBeCloseTo(10_000 / DURATION);
    });

    it("finds correct recording when clicking within second recording", () => {
      const result = hitTestRecording(new Date(BASE_TIME + 70_000), recordings);
      expect(result!.recording.id).toBe(2);
      expect(result!.offsetRatio).toBeCloseTo(10_000 / DURATION);
    });

    it("finds correct recording when clicking within third recording", () => {
      const result = hitTestRecording(new Date(BASE_TIME + 140_000), recordings);
      expect(result!.recording.id).toBe(3);
      expect(result!.offsetRatio).toBeCloseTo(20_000 / DURATION);
    });

    it("in gap closer to left recording, returns left recording", () => {
      // Gap: BASE+30s to BASE+60s. Midpoint = BASE+45s. Click at BASE+35s (closer to left end)
      const result = hitTestRecording(new Date(BASE_TIME + 35_000), recordings);
      expect(result!.recording.id).toBe(1);
      expect(result!.offsetRatio).toBe(0);
    });

    it("in gap closer to right recording, returns right recording", () => {
      // Gap: BASE+30s to BASE+60s. Click at BASE+55s (closer to right start)
      const result = hitTestRecording(new Date(BASE_TIME + 55_000), recordings);
      expect(result!.recording.id).toBe(2);
      expect(result!.offsetRatio).toBe(0);
    });

    it("in gap at exact midpoint, returns left recording (tie-break)", () => {
      // Gap: BASE+30s to BASE+60s. Midpoint = BASE+45s.
      const result = hitTestRecording(new Date(BASE_TIME + 45_000), recordings);
      expect(result!.recording.id).toBe(1);
      expect(result!.offsetRatio).toBe(0);
    });

    it("before first recording, returns first recording", () => {
      const result = hitTestRecording(new Date(BASE_TIME - 10_000), recordings);
      expect(result!.recording.id).toBe(1);
      expect(result!.offsetRatio).toBe(0);
    });

    it("after last recording, returns last recording", () => {
      const result = hitTestRecording(new Date(BASE_TIME + 200_000), recordings);
      expect(result!.recording.id).toBe(3);
      expect(result!.offsetRatio).toBe(0);
    });
  });

  describe("custom duration", () => {
    const recordings = [makeRecording(1, BASE_TIME)];
    const customDuration = 10_000; // 10 seconds

    it("uses custom duration for hit detection", () => {
      // Within 10s duration
      const within = hitTestRecording(new Date(BASE_TIME + 5_000), recordings, customDuration);
      expect(within!.recording.id).toBe(1);
      expect(within!.offsetRatio).toBeCloseTo(0.5);

      // Outside 10s duration but within default 30s
      const outside = hitTestRecording(new Date(BASE_TIME + 15_000), recordings, customDuration);
      expect(outside!.recording.id).toBe(1);
      expect(outside!.offsetRatio).toBe(0); // gap hit
    });
  });

  describe("performance", () => {
    it("handles 500 recordings in under 1ms", () => {
      const recordings: TimelineRecording[] = [];
      for (let i = 0; i < 500; i++) {
        recordings.push(makeRecording(i, BASE_TIME + i * 120_000)); // every 2 minutes
      }

      // Target: middle of the 250th recording
      const target = new Date(BASE_TIME + 250 * 120_000 + DURATION / 2);

      const start = performance.now();
      const result = hitTestRecording(target, recordings);
      const elapsed = performance.now() - start;

      expect(result).not.toBeNull();
      expect(result!.recording.id).toBe(250);
      expect(elapsed).toBeLessThan(1);
    });

    it("handles 10000 recordings efficiently", () => {
      const recordings: TimelineRecording[] = [];
      for (let i = 0; i < 10_000; i++) {
        recordings.push(makeRecording(i, BASE_TIME + i * 60_000));
      }

      const target = new Date(BASE_TIME + 5000 * 60_000 + 15_000);

      const start = performance.now();
      const result = hitTestRecording(target, recordings);
      const elapsed = performance.now() - start;

      expect(result).not.toBeNull();
      expect(result!.recording.id).toBe(5000);
      expect(elapsed).toBeLessThan(1);
    });
  });

  describe("edge cases", () => {
    it("handles recordings with same timestamp", () => {
      const recordings = [
        makeRecording(1, BASE_TIME),
        makeRecording(2, BASE_TIME),
      ];
      const result = hitTestRecording(new Date(BASE_TIME), recordings);
      expect(result).not.toBeNull();
      // Should return one of the two recordings at offset 0
      expect(result!.offsetRatio).toBe(0);
    });

    it("handles zero duration", () => {
      const recordings = [makeRecording(1, BASE_TIME)];
      const result = hitTestRecording(new Date(BASE_TIME), recordings, 0);
      expect(result).not.toBeNull();
      expect(result!.recording.id).toBe(1);
      expect(result!.offsetRatio).toBe(0);
    });
  });
});

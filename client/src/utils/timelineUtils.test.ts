import { describe, it, expect } from "vitest";
import { pixelToTime, timeToPixel } from "./timelineUtils";
import type { TimeRange } from "../components/timeline/TimelineBar";

const from = new Date("2026-03-23T00:00:00Z");
const to = new Date("2026-03-23T12:00:00Z");
const timeRange: TimeRange = { from, to };
const containerWidth = 1000;

describe("pixelToTime", () => {
  it("returns `from` at 0% (xOffset = 0)", () => {
    const result = pixelToTime(0, containerWidth, timeRange);
    expect(result.getTime()).toBe(from.getTime());
  });

  it("returns midpoint at 50% (xOffset = 500)", () => {
    const result = pixelToTime(500, containerWidth, timeRange);
    const expectedMs = from.getTime() + (to.getTime() - from.getTime()) / 2;
    expect(result.getTime()).toBe(expectedMs);
  });

  it("returns `to` at 100% (xOffset = containerWidth)", () => {
    const result = pixelToTime(containerWidth, containerWidth, timeRange);
    expect(result.getTime()).toBe(to.getTime());
  });

  it("clamps negative xOffset to `from`", () => {
    const result = pixelToTime(-100, containerWidth, timeRange);
    expect(result.getTime()).toBe(from.getTime());
  });

  it("clamps xOffset exceeding containerWidth to `to`", () => {
    const result = pixelToTime(1500, containerWidth, timeRange);
    expect(result.getTime()).toBe(to.getTime());
  });

  it("returns `from` when containerWidth is 0", () => {
    const result = pixelToTime(500, 0, timeRange);
    expect(result.getTime()).toBe(from.getTime());
  });

  it("returns `from` when containerWidth is negative", () => {
    const result = pixelToTime(500, -100, timeRange);
    expect(result.getTime()).toBe(from.getTime());
  });
});

describe("timeToPixel", () => {
  it("returns 0 at `from`", () => {
    expect(timeToPixel(from, containerWidth, timeRange)).toBe(0);
  });

  it("returns containerWidth / 2 at midpoint", () => {
    const mid = new Date(from.getTime() + (to.getTime() - from.getTime()) / 2);
    expect(timeToPixel(mid, containerWidth, timeRange)).toBe(500);
  });

  it("returns containerWidth at `to`", () => {
    expect(timeToPixel(to, containerWidth, timeRange)).toBe(containerWidth);
  });

  it("clamps time before `from` to 0", () => {
    const before = new Date(from.getTime() - 60_000);
    expect(timeToPixel(before, containerWidth, timeRange)).toBe(0);
  });

  it("clamps time after `to` to containerWidth", () => {
    const after = new Date(to.getTime() + 60_000);
    expect(timeToPixel(after, containerWidth, timeRange)).toBe(containerWidth);
  });

  it("returns 0 when containerWidth is 0", () => {
    expect(timeToPixel(from, 0, timeRange)).toBe(0);
  });

  it("returns 0 when time range is zero-length", () => {
    const zeroRange: TimeRange = { from, to: from };
    expect(timeToPixel(from, containerWidth, zeroRange)).toBe(0);
  });
});

describe("pixelToTime / timeToPixel roundtrip", () => {
  it("timeToPixel(pixelToTime(x)) ≈ x for values within range", () => {
    for (const x of [0, 100, 250, 500, 750, 999, 1000]) {
      const time = pixelToTime(x, containerWidth, timeRange);
      const pixel = timeToPixel(time, containerWidth, timeRange);
      expect(pixel).toBeCloseTo(x, 5);
    }
  });
});

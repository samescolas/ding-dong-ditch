import { describe, it, expect } from "vitest";
import { formatWallClockTime } from "./formatWallClockTime";

describe("formatWallClockTime", () => {
  // --- valid inputs ---

  it("returns formatted wall-clock time for a valid ISO timestamp", () => {
    // 2024-06-15T14:30:00Z + 15 seconds → 2:30 PM UTC
    const result = formatWallClockTime("2024-06-15T14:30:00Z", 15);
    expect(result).toBeTypeOf("string");
    expect(result).not.toBeNull();
    // Should contain a time-like pattern (digit:digit digit)
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns a time string at currentTime 0", () => {
    const result = formatWallClockTime("2024-06-15T14:30:00Z", 0);
    expect(result).toBeTypeOf("string");
    expect(result).not.toBeNull();
  });

  // --- null / undefined timestamp ---

  it("returns null for null timestamp", () => {
    expect(formatWallClockTime(null, 10)).toBeNull();
  });

  it("returns null for undefined timestamp", () => {
    expect(formatWallClockTime(undefined, 10)).toBeNull();
  });

  // --- empty / sentinel strings ---

  it("returns null for empty string timestamp", () => {
    expect(formatWallClockTime("", 10)).toBeNull();
  });

  it('returns null for literal "undefined" string', () => {
    expect(formatWallClockTime("undefined", 10)).toBeNull();
  });

  it('returns null for literal "null" string', () => {
    expect(formatWallClockTime("null", 10)).toBeNull();
  });

  // --- malformed ISO strings ---

  it("returns null for non-date string", () => {
    expect(formatWallClockTime("not-a-date", 10)).toBeNull();
  });

  it("returns null for malformed ISO with invalid month/day", () => {
    expect(formatWallClockTime("2024-13-45", 10)).toBeNull();
  });

  it("returns null for random garbage string", () => {
    expect(formatWallClockTime("xyz123", 10)).toBeNull();
  });

  // --- invalid currentTime ---

  it("returns null when currentTime is NaN", () => {
    expect(formatWallClockTime("2024-06-15T14:30:00Z", NaN)).toBeNull();
  });

  it("returns null when currentTime is Infinity", () => {
    expect(formatWallClockTime("2024-06-15T14:30:00Z", Infinity)).toBeNull();
  });

  it("returns null when currentTime is -Infinity", () => {
    expect(formatWallClockTime("2024-06-15T14:30:00Z", -Infinity)).toBeNull();
  });

  // --- edge case: negative currentTime (seeking before start) ---

  it("returns a valid time for negative currentTime", () => {
    // Negative currentTime is unusual but should not crash
    const result = formatWallClockTime("2024-06-15T14:30:00Z", -5);
    expect(result).toBeTypeOf("string");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

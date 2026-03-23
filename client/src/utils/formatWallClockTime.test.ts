import { describe, it, expect } from "vitest";
import { formatWallClockTime } from "./formatWallClockTime";

describe("formatWallClockTime", () => {
  // Use UTC timestamps and verify against known UTC times to avoid TZ flakiness.
  // The function uses local time via Date methods, so we set TZ=UTC in vitest config.

  it("returns formatted wall-clock time for valid inputs", () => {
    // 2024-01-15T14:30:00Z + 15s => 2:30:15 PM
    expect(formatWallClockTime("2024-01-15T14:30:00Z", 15)).toBe(
      "2:30:15 PM",
    );
  });

  it("adds currentTime seconds to the recording start", () => {
    // 10:00:00 AM + 90s => 10:01:30 AM
    expect(formatWallClockTime("2024-01-15T10:00:00Z", 90)).toBe(
      "10:01:30 AM",
    );
  });

  it("handles midnight rollover (PM to AM)", () => {
    // 11:59:00 PM + 120s => 12:01:00 AM next day
    expect(formatWallClockTime("2024-01-15T23:59:00Z", 120)).toBe(
      "12:01:00 AM",
    );
  });

  it("handles noon boundary (AM to PM)", () => {
    // 11:59:00 AM + 120s => 12:01:00 PM
    expect(formatWallClockTime("2024-01-15T11:59:00Z", 120)).toBe(
      "12:01:00 PM",
    );
  });

  it("displays 12 for midnight (not 0)", () => {
    expect(formatWallClockTime("2024-01-15T00:00:00Z", 0)).toBe(
      "12:00:00 AM",
    );
  });

  it("displays 12 for noon", () => {
    expect(formatWallClockTime("2024-01-15T12:00:00Z", 0)).toBe(
      "12:00:00 PM",
    );
  });

  it("returns null for null timestamp", () => {
    expect(formatWallClockTime(null, 10)).toBeNull();
  });

  it("returns null for undefined timestamp", () => {
    expect(formatWallClockTime(undefined, 10)).toBeNull();
  });

  it("returns null for empty string timestamp", () => {
    expect(formatWallClockTime("", 10)).toBeNull();
  });

  it("returns null for malformed ISO string", () => {
    expect(formatWallClockTime("not-a-date", 10)).toBeNull();
  });

  it("returns null for negative currentTime", () => {
    expect(formatWallClockTime("2024-01-15T10:00:00Z", -5)).toBeNull();
  });

  it("returns null for NaN currentTime", () => {
    expect(formatWallClockTime("2024-01-15T10:00:00Z", NaN)).toBeNull();
  });

  it("returns null for Infinity currentTime", () => {
    expect(formatWallClockTime("2024-01-15T10:00:00Z", Infinity)).toBeNull();
  });

  it("handles zero currentTime", () => {
    expect(formatWallClockTime("2024-01-15T14:30:00Z", 0)).toBe(
      "2:30:00 PM",
    );
  });

  it("handles fractional seconds (truncated by Date)", () => {
    // 10:00:00 + 1.999s => still shows 10:00:01
    expect(formatWallClockTime("2024-01-15T10:00:00Z", 1.999)).toBe(
      "10:00:01 AM",
    );
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("./clip-recorder.js", () => ({
  recordClip: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../config/store.js", () => ({
  getCameraConfig: vi.fn().mockReturnValue({
    enabled: true,
    recordingDuration: 120,
    cooldownSeconds: 20,
  }),
}));

vi.mock("./snapshot.js", () => ({
  captureSnapshot: vi.fn().mockResolvedValue({ key: "2024-01-15/Cam/12-00-00.jpg", buffer: Buffer.from("img") }),
}));

vi.mock("../ai/describe.js", () => ({
  describeSnapshot: vi.fn().mockResolvedValue("A person at the door."),
}));

import { handleMotion } from "./motion-handler.js";
import { recordClip } from "./clip-recorder.js";
import { getCameraConfig } from "../config/store.js";
import { captureSnapshot } from "./snapshot.js";
import { describeSnapshot } from "../ai/describe.js";

function makeCam(id: number, name: string) {
  return { id, name } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset module-level state by re-importing would be ideal,
  // but for now we rely on unique camera IDs per test
});

afterEach(() => {
  vi.useRealTimers();
});

describe("motion-handler", () => {
  it("records a clip on motion event", async () => {
    const cam = makeCam(1, "Front Door");
    await handleMotion(cam);

    expect(captureSnapshot).toHaveBeenCalledWith(cam);
    expect(describeSnapshot).toHaveBeenCalledWith(Buffer.from("img"), "Front Door");
    expect(recordClip).toHaveBeenCalledWith(
      cam, 120, "2024-01-15/Cam/12-00-00.jpg", expect.any(Promise), expect.objectContaining({ value: 'motion' }),
    );
    // The promise should resolve to the AI description
    const descPromise = vi.mocked(recordClip).mock.calls[0][3] as Promise<string | undefined>;
    await expect(descPromise).resolves.toBe("A person at the door.");
  });

  it("skips recording when already recording", async () => {
    const cam = makeCam(2, "Back Door");

    // Make both captureSnapshot and recordClip hang to simulate ongoing recording
    let resolveSnapshot!: (v: any) => void;
    vi.mocked(captureSnapshot).mockImplementationOnce(
      () => new Promise((r) => { resolveSnapshot = r; }),
    );

    // Start first recording (won't resolve because captureSnapshot hangs)
    const p1 = handleMotion(cam);

    // Allow microtasks to flush so state.recording = true
    await new Promise((r) => setTimeout(r, 10));

    // Second call should skip because first is still in progress
    await handleMotion(cam);

    // captureSnapshot should only have been called once (from first call)
    expect(captureSnapshot).toHaveBeenCalledTimes(1);

    // Clean up
    resolveSnapshot(null);
    await p1;
  });

  it("skips recording during cooldown period", async () => {
    vi.mocked(getCameraConfig).mockReturnValue({
      enabled: true,
      recordingDuration: 10,
      cooldownSeconds: 60,
    });

    const cam = makeCam(3, "Side Gate");

    // Fast-resolve recordClip
    vi.mocked(recordClip).mockResolvedValue(undefined);

    await handleMotion(cam);
    expect(recordClip).toHaveBeenCalledTimes(1);

    // Immediately try again — should be in cooldown
    await handleMotion(cam);
    expect(recordClip).toHaveBeenCalledTimes(1); // still just 1
  });

  it("passes doorbell eventType to recordClip when triggered by doorbell", async () => {
    vi.mocked(getCameraConfig).mockReturnValue({
      enabled: true,
      recordingDuration: 120,
      cooldownSeconds: 20,
    });
    const cam = makeCam(5, "Front Door");
    await handleMotion(cam, "doorbell");

    expect(recordClip).toHaveBeenCalledWith(
      cam, 120, "2024-01-15/Cam/12-00-00.jpg", expect.any(Promise), expect.objectContaining({ value: 'doorbell' }),
    );
  });

  it("doorbell arriving during motion recording upgrades event type", async () => {
    vi.mocked(getCameraConfig).mockReturnValue({
      enabled: true,
      recordingDuration: 120,
      cooldownSeconds: 20,
    });

    const cam = makeCam(6, "Front Door Bell");

    // Make captureSnapshot hang so the first handleMotion stays in progress
    let resolveSnapshot!: (v: any) => void;
    vi.mocked(captureSnapshot).mockImplementationOnce(
      () => new Promise((r) => { resolveSnapshot = r; }),
    );

    // Start first recording with 'motion' — will hang at captureSnapshot
    const p1 = handleMotion(cam, 'motion');

    // Allow microtasks to flush so s.recording = true is set
    await new Promise((r) => setTimeout(r, 10));

    // Doorbell arrives while motion recording is in progress — should upgrade the ref
    await handleMotion(cam, 'doorbell');

    // Unblock the first recording
    resolveSnapshot({ key: "2024-01-15/Cam/12-00-00.jpg", buffer: Buffer.from("img") });
    await p1;

    // recordClip should have been called exactly once
    expect(recordClip).toHaveBeenCalledTimes(1);
    // The eventType ref passed to recordClip should have been upgraded to 'doorbell'
    const eventTypeRef = vi.mocked(recordClip).mock.calls[0][4] as { value: string };
    expect(eventTypeRef.value).toBe('doorbell');
  });

  it("passes undefined description when snapshot fails", async () => {
    vi.mocked(captureSnapshot).mockResolvedValueOnce(null);
    // Ensure getCameraConfig returns defaults (may have been changed by earlier tests)
    vi.mocked(getCameraConfig).mockReturnValue({
      enabled: true,
      recordingDuration: 120,
      cooldownSeconds: 20,
    });

    const cam = makeCam(4, "Garage");
    await handleMotion(cam);

    expect(describeSnapshot).not.toHaveBeenCalled();
    expect(recordClip).toHaveBeenCalledWith(cam, 120, undefined, expect.any(Promise), expect.objectContaining({ value: 'motion' }));
    // The promise should resolve to undefined when no snapshot
    const descPromise = vi.mocked(recordClip).mock.calls[0][3] as Promise<string | undefined>;
    await expect(descPromise).resolves.toBeUndefined();
  });
});

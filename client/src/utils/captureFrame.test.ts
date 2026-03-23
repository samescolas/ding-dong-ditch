// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureFrame } from "./captureFrame";

// ---------------------------------------------------------------------------
// Helpers – lightweight mocks for HTMLVideoElement and Canvas APIs
// ---------------------------------------------------------------------------

function makeVideo(
  overrides: Partial<{ videoWidth: number; videoHeight: number }> = {},
): HTMLVideoElement {
  return {
    videoWidth: overrides.videoWidth ?? 1920,
    videoHeight: overrides.videoHeight ?? 1080,
  } as unknown as HTMLVideoElement;
}

function makeCanvasCtx(options?: { drawImageThrows?: boolean }) {
  return {
    drawImage: options?.drawImageThrows
      ? vi.fn(() => {
          throw new DOMException("cross-origin", "SecurityError");
        })
      : vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function installCanvasMock(ctx: CanvasRenderingContext2D | null, toDataURLValue = "data:image/jpeg;base64,abc") {
  const canvasSpy = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => toDataURLValue),
  };

  vi.spyOn(document, "createElement").mockReturnValue(canvasSpy as unknown as HTMLElement);
  return canvasSpy;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("captureFrame", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a JPEG data URL for a valid video", () => {
    const ctx = makeCanvasCtx();
    const expectedDataUrl = "data:image/jpeg;base64,thumb";
    const canvas = installCanvasMock(ctx, expectedDataUrl);
    const video = makeVideo();

    const result = captureFrame(video);

    expect(result).toBe(expectedDataUrl);
    expect(canvas.width).toBe(160);
    // 1080/1920 * 160 = 90
    expect(canvas.height).toBe(90);
    expect(ctx.drawImage).toHaveBeenCalledWith(video, 0, 0, 160, 90);
    expect(canvas.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.7);
  });

  it("computes height from a non-16:9 aspect ratio", () => {
    const ctx = makeCanvasCtx();
    installCanvasMock(ctx);
    // 4:3 video → height = 160 * (3/4) = 120
    const video = makeVideo({ videoWidth: 640, videoHeight: 480 });

    captureFrame(video);

    expect(ctx.drawImage).toHaveBeenCalledWith(video, 0, 0, 160, 120);
  });

  it("returns null when videoWidth is 0", () => {
    const video = makeVideo({ videoWidth: 0 });
    expect(captureFrame(video)).toBeNull();
  });

  it("returns null when videoHeight is 0", () => {
    const video = makeVideo({ videoHeight: 0 });
    expect(captureFrame(video)).toBeNull();
  });

  it("returns null when canvas 2d context is unavailable", () => {
    installCanvasMock(null);
    const video = makeVideo();
    expect(captureFrame(video)).toBeNull();
  });

  it("returns null when toDataURL throws (cross-origin)", () => {
    const ctx = makeCanvasCtx();
    const canvas = installCanvasMock(ctx);
    canvas.toDataURL.mockImplementation(() => {
      throw new DOMException("tainted canvas", "SecurityError");
    });

    const video = makeVideo();
    expect(captureFrame(video)).toBeNull();
  });

  it("returns null when drawImage throws", () => {
    const ctx = makeCanvasCtx({ drawImageThrows: true });
    installCanvasMock(ctx);

    const video = makeVideo();
    expect(captureFrame(video)).toBeNull();
  });
});

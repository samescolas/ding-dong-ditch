// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useThumbnailVideo } from "./useThumbnailVideo";

// Mock video element
function createMockVideo(): HTMLVideoElement & { _listeners: Record<string, Function[]> } {
  const listeners: Record<string, Function[]> = {};
  const video = {
    _listeners: listeners,
    muted: false,
    preload: "",
    src: "",
    currentTime: 0,
    duration: 10,
    readyState: 0,
    style: {} as CSSStyleDeclaration,
    setAttribute: vi.fn(),
    getAttribute: vi.fn((attr: string) => {
      if (attr === "src") return video.src;
      return null;
    }),
    removeAttribute: vi.fn(),
    addEventListener: vi.fn((event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    load: vi.fn(),
    pause: vi.fn(),
  } as unknown as HTMLVideoElement & { _listeners: Record<string, Function[]> };

  return video;
}

function fireEvent(video: ReturnType<typeof createMockVideo>, event: string) {
  const handlers = [...(video._listeners[event] || [])];
  handlers.forEach((h) => h());
}

describe("useThumbnailVideo", () => {
  let mockVideo: ReturnType<typeof createMockVideo>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    mockVideo = createMockVideo();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "video") return mockVideo as unknown as HTMLVideoElement;
      return originalCreateElement(tag);
    });
    appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a muted video element with preload=metadata on mount", () => {
    renderHook(() => useThumbnailVideo());

    expect(document.createElement).toHaveBeenCalledWith("video");
    expect(mockVideo.muted).toBe(true);
    expect(mockVideo.preload).toBe("metadata");
    expect(appendChildSpy).toHaveBeenCalledWith(mockVideo);
  });

  it("positions the video element off-screen", () => {
    renderHook(() => useThumbnailVideo());

    expect(mockVideo.style.position).toBe("fixed");
    expect(mockVideo.style.left).toBe("-9999px");
    expect(mockVideo.style.opacity).toBe("0");
  });

  it("cleans up the video element on unmount", () => {
    const { unmount } = renderHook(() => useThumbnailVideo());

    unmount();

    expect(mockVideo.pause).toHaveBeenCalled();
    expect(mockVideo.removeAttribute).toHaveBeenCalledWith("src");
    expect(mockVideo.load).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(mockVideo);
  });

  it("starts with isReady=false and isLoading=false", () => {
    const { result } = renderHook(() => useThumbnailVideo());

    expect(result.current.isReady).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("sets isLoading=true when requestFrame is called", () => {
    const { result } = renderHook(() => useThumbnailVideo());

    act(() => {
      result.current.requestFrame("cam1/video.mp4", 0.5);
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isReady).toBe(false);
  });

  it("sets the video src to the API URL", () => {
    const { result } = renderHook(() => useThumbnailVideo());

    act(() => {
      result.current.requestFrame("cam1/video.mp4", 0.5);
    });

    expect(mockVideo.src).toBe("/api/recordings/cam1/video.mp4");
    expect(mockVideo.load).toHaveBeenCalled();
  });

  it("seeks to duration * seekRatio on loadedmetadata and fires onFrameReady on seeked", () => {
    const onFrameReady = vi.fn();
    const { result } = renderHook(() => useThumbnailVideo({ onFrameReady }));

    act(() => {
      result.current.requestFrame("cam1/video.mp4", 0.5);
    });

    // Simulate loadedmetadata
    mockVideo.readyState = 1;
    mockVideo.duration = 10;
    act(() => {
      fireEvent(mockVideo, "loadedmetadata");
    });

    expect(mockVideo.currentTime).toBe(5); // 10 * 0.5

    // Simulate seeked
    act(() => {
      fireEvent(mockVideo, "seeked");
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(onFrameReady).toHaveBeenCalledWith(mockVideo);
  });

  it("clamps seekRatio to [0, 1]", () => {
    const { result } = renderHook(() => useThumbnailVideo());

    act(() => {
      result.current.requestFrame("cam1/video.mp4", 1.5);
    });

    mockVideo.duration = 10;
    act(() => {
      fireEvent(mockVideo, "loadedmetadata");
    });

    // Clamped to 1.0, so currentTime = 10
    expect(mockVideo.currentTime).toBe(10);
  });

  it("seeks directly when the same source is already loaded", () => {
    const onFrameReady = vi.fn();
    const { result } = renderHook(() => useThumbnailVideo({ onFrameReady }));

    // First request — load the source
    act(() => {
      result.current.requestFrame("cam1/video.mp4", 0.3);
    });

    mockVideo.duration = 10;
    mockVideo.readyState = 1;
    act(() => {
      fireEvent(mockVideo, "loadedmetadata");
    });
    act(() => {
      fireEvent(mockVideo, "seeked");
    });

    // Now the source is loaded. Make src match for the check.
    // The hook checks video.src.endsWith(apiUrl) || getAttribute("src") === apiUrl
    // Since our mock doesn't have a full URL, set getAttribute to return the API URL
    mockVideo.getAttribute = vi.fn((attr: string) => {
      if (attr === "src") return "/api/recordings/cam1/video.mp4";
      return null;
    });

    const loadCallsBefore = (mockVideo.load as ReturnType<typeof vi.fn>).mock.calls.length;

    // Second request with same recording but different ratio
    act(() => {
      result.current.requestFrame("cam1/video.mp4", 0.7);
    });

    // Should NOT call load again (same source, readyState >= 1)
    expect((mockVideo.load as ReturnType<typeof vi.fn>).mock.calls.length).toBe(loadCallsBefore);
    expect(mockVideo.currentTime).toBe(7); // 10 * 0.7

    act(() => {
      fireEvent(mockVideo, "seeked");
    });

    expect(result.current.isReady).toBe(true);
    expect(onFrameReady).toHaveBeenCalledTimes(2);
  });

  it("cancels stale requests when a new recording path is requested", () => {
    const onFrameReady = vi.fn();
    const { result } = renderHook(() => useThumbnailVideo({ onFrameReady }));

    // First request
    act(() => {
      result.current.requestFrame("cam1/video1.mp4", 0.5);
    });

    // Second request before first finishes
    act(() => {
      result.current.requestFrame("cam1/video2.mp4", 0.3);
    });

    // Simulate loadedmetadata for the first request (stale)
    // The handler for video1 should have been removed, but even if it fires,
    // the request check should prevent it from proceeding
    mockVideo.duration = 10;

    // Simulate loadedmetadata for the second (current) request
    act(() => {
      fireEvent(mockVideo, "loadedmetadata");
    });

    expect(mockVideo.currentTime).toBe(3); // video2 at 0.3

    act(() => {
      fireEvent(mockVideo, "seeked");
    });

    expect(onFrameReady).toHaveBeenCalledTimes(1);
    expect(result.current.isReady).toBe(true);
  });

  it("handles video load errors gracefully", () => {
    const onFrameReady = vi.fn();
    const { result } = renderHook(() => useThumbnailVideo({ onFrameReady }));

    act(() => {
      result.current.requestFrame("cam1/broken.mp4", 0.5);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      fireEvent(mockVideo, "error");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isReady).toBe(false);
    expect(onFrameReady).not.toHaveBeenCalled();
  });

  it("sets aria-hidden on the video element", () => {
    renderHook(() => useThumbnailVideo());

    expect(mockVideo.setAttribute).toHaveBeenCalledWith("aria-hidden", "true");
  });
});

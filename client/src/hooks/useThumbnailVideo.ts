import { useRef, useCallback, useState, useEffect } from "react";

export interface UseThumbnailVideoOptions {
  /** Called when the video has seeked to the requested position and is ready for frame capture */
  onFrameReady?: (video: HTMLVideoElement) => void;
}

export interface UseThumbnailVideoReturn {
  /** The hidden video element (null until mounted) */
  videoElement: HTMLVideoElement | null;
  /** True when metadata is loaded and the element can seek */
  isReady: boolean;
  /** True while loading a new source or seeking */
  isLoading: boolean;
  /** Load a recording and seek to a position within it */
  requestFrame: (recordingPath: string, seekRatio: number) => void;
}

/**
 * Manages a single hidden <video> element for thumbnail frame capture.
 * The element is created once, muted, with preload="metadata".
 * Callers use `requestFrame` to load a recording URL and seek to a ratio (0–1).
 * When seeking completes, `onFrameReady` fires with the video element.
 */
export function useThumbnailVideo(
  options: UseThumbnailVideoOptions = {},
): UseThumbnailVideoReturn {
  const { onFrameReady } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Track the current request so we can discard stale callbacks
  const currentRequestRef = useRef<{ path: string; seekRatio: number } | null>(null);
  const onFrameReadyRef = useRef(onFrameReady);
  onFrameReadyRef.current = onFrameReady;

  // Create the video element once on mount, clean up on unmount
  useEffect(() => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.setAttribute("aria-hidden", "true");

    // Position off-screen so browsers allow seeking (some need DOM attachment)
    video.style.position = "fixed";
    video.style.left = "-9999px";
    video.style.top = "-9999px";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    document.body.appendChild(video);

    videoRef.current = video;

    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load(); // release resources
      document.body.removeChild(video);
      videoRef.current = null;
    };
  }, []);

  const requestFrame = useCallback((recordingPath: string, seekRatio: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedRatio = Math.max(0, Math.min(1, seekRatio));
    const apiUrl = `/api/recordings/${recordingPath}`;

    currentRequestRef.current = { path: recordingPath, seekRatio: clampedRatio };
    setIsLoading(true);
    setIsReady(false);

    const isSameSource = video.src.endsWith(apiUrl) || video.getAttribute("src") === apiUrl;

    const seekToPosition = () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) return;

      const targetTime = duration * clampedRatio;

      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);

        // Only fire callback if this is still the current request
        const req = currentRequestRef.current;
        if (req && req.path === recordingPath && req.seekRatio === clampedRatio) {
          setIsLoading(false);
          setIsReady(true);
          onFrameReadyRef.current?.(video);
        }
      };

      video.addEventListener("seeked", onSeeked);
      video.currentTime = targetTime;
    };

    if (isSameSource && video.readyState >= 1) {
      // Metadata already loaded for this source — seek directly
      seekToPosition();
    } else {
      // Load new source
      const onLoadedMetadata = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("error", onError);

        // Verify this is still the current request
        const req = currentRequestRef.current;
        if (req && req.path === recordingPath) {
          seekToPosition();
        }
      };

      const onError = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("error", onError);

        const req = currentRequestRef.current;
        if (req && req.path === recordingPath) {
          setIsLoading(false);
          setIsReady(false);
        }
      };

      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("error", onError);
      video.src = apiUrl;
      video.load();
    }
  }, []);

  return {
    videoElement: videoRef.current,
    isReady,
    isLoading,
    requestFrame,
  };
}

/**
 * Thumbnail width in pixels. Height is computed from the video aspect ratio.
 */
const THUMBNAIL_WIDTH = 160;

/**
 * Default thumbnail height when the video aspect ratio cannot be determined (16:9).
 */
const DEFAULT_THUMBNAIL_HEIGHT = 90;

/**
 * JPEG quality used when encoding the captured frame (0–1).
 */
const JPEG_QUALITY = 0.7;

/**
 * Capture the current frame from an HTMLVideoElement and return it as a
 * JPEG data-URL suitable for use as an <img> src.
 *
 * Returns `null` when the video has not loaded yet (dimensions are zero),
 * the 2-D canvas context is unavailable, or the frame cannot be exported
 * (e.g. due to a cross-origin restriction).
 */
export function captureFrame(video: HTMLVideoElement): string | null {
  // Guard: video must have valid intrinsic dimensions
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const aspectRatio = video.videoHeight / video.videoWidth;
  const width = THUMBNAIL_WIDTH;
  const height = Math.round(THUMBNAIL_WIDTH * aspectRatio) || DEFAULT_THUMBNAIL_HEIGHT;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  try {
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    // Cross-origin or other SecurityError from toDataURL
    return null;
  }
}

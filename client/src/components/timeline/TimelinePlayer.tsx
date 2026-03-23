import { useCallback, useEffect, useRef, useState } from "react";
import type { TimelineRecording } from "../../types/timeline";
import { formatWallClockTime } from "../../utils/formatWallClockTime";
import "./TimelinePlayer.css";

interface TimelinePlayerProps {
  recording: TimelineRecording | null;
  onPrevious: () => void;
  onNext: () => void;
  onDelete: (recording: TimelineRecording) => void;
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${datePart} at ${timePart}`;
}

/**
 * Extract camera name from path format: "YYYY-MM-DD/camera_name/HH-MM-SS.mp4"
 */
function extractCameraName(path: string): string {
  const parts = path.split("/");
  if (parts.length >= 3) {
    return parts[1].replace(/_/g, " ");
  }
  return "Unknown camera";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format seconds into m:ss or h:mm:ss as appropriate.
 */
function formatVideoTime(totalSeconds: number): string {
  const rounded = Math.floor(totalSeconds);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function eventLabel(eventType: string | null): string {
  switch (eventType) {
    case "doorbell":
      return "Doorbell ring";
    case "motion":
      return "Motion";
    default:
      return eventType ?? "Event";
  }
}

export default function TimelinePlayer({
  recording,
  onPrevious,
  onNext,
  onDelete,
}: TimelinePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  useEffect(() => {
    setError(false);
    setCurrentTime(0);
    setDuration(0);
    if (recording && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {
        // autoplay may be blocked by browser policy; controls remain available
      });
    }
  }, [recording?.path]);

  if (!recording) {
    return (
      <div className="timeline-player">
        <div className="timeline-player__empty">
          <svg
            className="timeline-player__empty-icon"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="timeline-player__empty-title">No recording selected</h3>
          <p className="timeline-player__empty-subtitle">
            Select a recording from the timeline below to start reviewing
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="timeline-player">
        <div className="timeline-player__error">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Failed to load video
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-player">
      <div className="timeline-player__video-wrapper">
        <video
          ref={videoRef}
          controls
          playsInline
          src={`/api/recordings/${recording.path}`}
          onError={() => setError(true)}
          onTimeUpdate={handleTimeUpdate}
          onSeeked={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
        <button
          className="timeline-player__nav timeline-player__nav--prev"
          onClick={onPrevious}
          aria-label="Previous recording"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          className="timeline-player__nav timeline-player__nav--next"
          onClick={onNext}
          aria-label="Next recording"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {duration > 0 && (() => {
        const wallClock = formatWallClockTime(recording.timestamp, currentTime);
        return (
          <div className="timeline-player__time-display">
            <span className="timeline-player__time-elapsed">
              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
            </span>
            {wallClock && (
              <>
                <span className="timeline-player__time-separator">&middot;</span>
                <span className="timeline-player__time-wall">{wallClock}</span>
              </>
            )}
          </div>
        );
      })()}

      <div className="timeline-player__meta">
        <div className="timeline-player__meta-primary">
          <span className="timeline-player__camera">
            {extractCameraName(recording.path)}
          </span>
          <span
            className={`timeline-player__event-badge${
              recording.event_type === "doorbell"
                ? " timeline-player__event-badge--doorbell"
                : ""
            }`}
          >
            {eventLabel(recording.event_type)}
          </span>
          {recording.size != null && (
            <span className="timeline-player__size">
              {formatFileSize(recording.size)}
            </span>
          )}
          <button
            className="timeline-player__delete"
            onClick={() => onDelete(recording)}
            aria-label="Delete recording"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <div className="timeline-player__meta-secondary">
          <span className="timeline-player__timestamp">
            {formatTimestamp(recording.timestamp)}
          </span>
          {recording.description && (
            <span className="timeline-player__description">
              {recording.description}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

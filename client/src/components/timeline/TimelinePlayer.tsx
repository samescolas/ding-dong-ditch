import { useEffect, useRef, useState } from "react";
import type { TimelineRecording } from "../../types/timeline";
import "./TimelinePlayer.css";

interface TimelinePlayerProps {
  recording: TimelineRecording | null;
  onPrevious: () => void;
  onNext: () => void;
  onDelete: (recording: TimelineRecording) => void;
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function eventLabel(eventType: string): string {
  switch (eventType) {
    case "doorbell":
      return "Doorbell ring";
    case "motion":
      return "Motion";
    default:
      return eventType;
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

  useEffect(() => {
    setError(false);
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
          Select a recording from the timeline below
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

      <div className="timeline-player__meta">
        <span className="timeline-player__timestamp">
          {formatTimestamp(recording.timestamp)}
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
        <span className="timeline-player__path">{recording.path}</span>
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
    </div>
  );
}

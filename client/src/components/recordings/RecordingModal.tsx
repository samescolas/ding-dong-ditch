import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Recording } from "../../types/recording";

interface RecordingModalProps {
  recording: Recording;
  onClose: () => void;
  onDelete: (path: string) => void;
}

function formatTime(file: string): string {
  return file.replace(".mp4", "").replace(/-/g, ":");
}

function formatSize(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function formatFullDate(dateStr: string, file: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  return `${formatted} at ${formatTime(file)}`;
}

export default function RecordingModal({ recording, onClose, onDelete }: RecordingModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    panelRef.current?.focus();

    // Prevent body scroll
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Focus trap
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, video, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      previousFocus.current?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Recording from ${recording.camera}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="recording-modal__video-container">
          <button
            className="recording-modal__close"
            onClick={onClose}
            aria-label="Close video player"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            src={`/api/recordings/${recording.path}`}
          />
        </div>

        <div className="recording-modal__details">
          <div className="recording-modal__camera">{recording.camera}</div>
          <div className="recording-modal__datetime">
            {formatFullDate(recording.date, recording.file)}
          </div>
          {recording.description && (
            <div className="recording-modal__description">{recording.description}</div>
          )}
          <div className="recording-modal__footer">
            <span className="recording-modal__size">{formatSize(recording.size)}</span>
            <button
              className="btn btn-danger"
              onClick={() => {
                onDelete(recording.path);
                onClose();
              }}
              aria-label="Delete this recording"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

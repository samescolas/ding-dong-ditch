import { useRef, useLayoutEffect, useState } from "react";
import type { TimelineRecording } from "./TimelineBar";
import "./HoverPreview.css";

interface HoverPreviewProps {
  recording: TimelineRecording;
  position: { x: number; y: number };
  onClose: () => void;
}

const TOOLTIP_WIDTH = 240;
const TOOLTIP_MARGIN = 8;

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function eventLabel(eventType: string | null): string {
  if (!eventType) return "Unknown";
  return eventType.charAt(0).toUpperCase() + eventType.slice(1);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "\u2026";
}

export function HoverPreview({ recording, position, onClose }: HoverPreviewProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<{ left: number; top: number }>({
    left: position.x,
    top: position.y,
  });

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = position.x - rect.width / 2;
    let top = position.y - rect.height - TOOLTIP_MARGIN;

    // Keep within horizontal bounds
    if (left < TOOLTIP_MARGIN) left = TOOLTIP_MARGIN;
    if (left + rect.width > vw - TOOLTIP_MARGIN) left = vw - TOOLTIP_MARGIN - rect.width;

    // If no room above, show below
    if (top < TOOLTIP_MARGIN) top = position.y + TOOLTIP_MARGIN;

    // Keep within vertical bounds
    if (top + rect.height > vh - TOOLTIP_MARGIN) top = vh - TOOLTIP_MARGIN - rect.height;

    setAdjustedPos({ left, top });
  }, [position.x, position.y]);

  const eventType = recording.event_type ?? "unknown";
  const badgeClass = `hover-preview__badge hover-preview__badge--${eventType}`;
  const description = truncate(recording.path, 100);

  return (
    <div
      ref={tooltipRef}
      className="hover-preview"
      style={{ left: adjustedPos.left, top: adjustedPos.top, width: TOOLTIP_WIDTH }}
      role="tooltip"
      onMouseLeave={onClose}
    >
      <div className="hover-preview__thumbnail">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <polyline points="8 21 12 17 16 21" />
        </svg>
      </div>
      <div className="hover-preview__info">
        <div className="hover-preview__header">
          <span className="hover-preview__time">{formatTimestamp(recording.timestamp)}</span>
          <span className={badgeClass}>{eventLabel(recording.event_type)}</span>
        </div>
        <p className="hover-preview__description">{description}</p>
      </div>
    </div>
  );
}

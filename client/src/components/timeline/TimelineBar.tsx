import { useRef, useMemo } from "react";
import "./TimelineBar.css";

export interface TimelineRecording {
  id: number;
  timestamp: string;
  event_type: string | null;
  snapshot_key: string | null;
  path: string;
}

export interface TimeRange {
  from: Date;
  to: Date;
}

interface TimelineBarProps {
  timeRange: TimeRange;
  recordings?: TimelineRecording[];
  selectedRecordingId?: number | null;
  onSelect?: (recording: TimelineRecording | null) => void;
}

interface TimeMarker {
  time: Date;
  label: string;
  position: number;
}

function formatTimeLabel(date: Date, rangeDays: number): string {
  if (rangeDays > 2) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function getMarkerInterval(rangeDays: number): number {
  if (rangeDays <= 0.1) return 5 * 60 * 1000;       // <=~2.4h: every 5 min
  if (rangeDays <= 1.5) return 60 * 60 * 1000;       // <=1.5 days: every 1 hour
  if (rangeDays <= 4) return 6 * 60 * 60 * 1000;     // <=4 days: every 6 hours
  return 24 * 60 * 60 * 1000;                         // >4 days: every day
}

function computeMarkers(timeRange: TimeRange): TimeMarker[] {
  const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
  const rangeDays = rangeMs / (24 * 60 * 60 * 1000);
  const interval = getMarkerInterval(rangeDays);

  const markers: TimeMarker[] = [];
  const startMs = Math.ceil(timeRange.from.getTime() / interval) * interval;

  for (let ms = startMs; ms <= timeRange.to.getTime(); ms += interval) {
    const time = new Date(ms);
    const position = ((ms - timeRange.from.getTime()) / rangeMs) * 100;
    markers.push({
      time,
      label: formatTimeLabel(time, rangeDays),
      position,
    });
  }

  return markers;
}

function getNowPosition(timeRange: TimeRange): number | null {
  const now = Date.now();
  const fromMs = timeRange.from.getTime();
  const toMs = timeRange.to.getTime();
  if (now < fromMs || now > toMs) return null;
  return ((now - fromMs) / (toMs - fromMs)) * 100;
}

export default function TimelineBar({
  timeRange,
  recordings = [],
  selectedRecordingId,
  onSelect,
}: TimelineBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const markers = useMemo(() => computeMarkers(timeRange), [timeRange]);
  const nowPosition = useMemo(() => getNowPosition(timeRange), [timeRange]);

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSelect) return;
    const target = e.target as HTMLElement;
    if (target.closest(".timeline-bar__block")) return;
    onSelect(null);
  };

  const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();

  return (
    <div className="timeline-bar" ref={containerRef} onClick={handleBarClick}>
      <div className="timeline-bar__track">
        {/* Time markers */}
        {markers.map((marker, i) => (
          <div
            key={i}
            className="timeline-bar__marker"
            style={{ left: `${marker.position}%` }}
          >
            <div className="timeline-bar__marker-tick" />
            <span className="timeline-bar__marker-label">{marker.label}</span>
          </div>
        ))}

        {/* Now indicator */}
        {nowPosition !== null && (
          <div
            className="timeline-bar__now"
            style={{ left: `${nowPosition}%` }}
            aria-label="Current time"
          />
        )}

        {/* Recording blocks (placeholder positions — full rendering is task 2.2) */}
        {recordings.map((rec) => {
          const recMs = new Date(rec.timestamp).getTime();
          const position = ((recMs - timeRange.from.getTime()) / rangeMs) * 100;
          const isSelected = selectedRecordingId === rec.id;
          return (
            <button
              key={rec.id}
              className={`timeline-bar__block timeline-bar__block--${rec.event_type || "motion"}${isSelected ? " timeline-bar__block--selected" : ""}`}
              style={{ left: `${position}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(rec);
              }}
              aria-label={`${rec.event_type || "motion"} event at ${new Date(rec.timestamp).toLocaleTimeString()}`}
            />
          );
        })}

        {/* Scrubber line for selected recording */}
        {selectedRecordingId != null && recordings.length > 0 && (() => {
          const selected = recordings.find((r) => r.id === selectedRecordingId);
          if (!selected) return null;
          const pos = ((new Date(selected.timestamp).getTime() - timeRange.from.getTime()) / rangeMs) * 100;
          return (
            <div className="timeline-bar__scrubber" style={{ left: `${pos}%` }} />
          );
        })()}
      </div>
    </div>
  );
}

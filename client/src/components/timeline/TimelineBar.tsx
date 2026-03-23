import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { pixelToTime, hitTestRecording, formatTooltipTime } from "../../utils/timelineUtils";
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
  onSelect?: (recording: TimelineRecording | null, seekRatio?: number) => void;
  centeredRecordingId?: number | null;
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
  if (rangeDays <= 0.1) return 5 * 60 * 1000;         // <=~2.4h: every 5 min
  if (rangeDays <= 0.25) return 15 * 60 * 1000;       // <=6h: every 15 min
  if (rangeDays <= 0.5) return 30 * 60 * 1000;        // <=12h: every 30 min
  if (rangeDays <= 1.5) return 60 * 60 * 1000;        // <=1.5 days: every 1 hour
  if (rangeDays <= 4) return 6 * 60 * 60 * 1000;      // <=4 days: every 6 hours
  return 24 * 60 * 60 * 1000;                          // >4 days: every day
}

/** Minimum pixel spacing between marker labels to prevent overlap */
const MIN_MARKER_SPACING_PX = 60;

function computeMarkers(timeRange: TimeRange, trackWidthPx: number): TimeMarker[] {
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

  // Filter out markers that would overlap based on pixel spacing
  if (trackWidthPx > 0 && markers.length > 1) {
    const filtered: TimeMarker[] = [markers[0]];
    for (let i = 1; i < markers.length; i++) {
      const prevPx = (filtered[filtered.length - 1].position / 100) * trackWidthPx;
      const currPx = (markers[i].position / 100) * trackWidthPx;
      if (currPx - prevPx >= MIN_MARKER_SPACING_PX) {
        filtered.push(markers[i]);
      }
    }
    return filtered;
  }

  return markers;
}

interface BlockLayout {
  recording: TimelineRecording;
  position: number;
  stackLevel: number;
}

/**
 * Compute block positions and assign stack levels so overlapping blocks
 * are vertically offset instead of merging into each other.
 * Minimum block visual width is 8px — blocks within that threshold overlap.
 */
function computeBlockLayouts(
  recordings: TimelineRecording[],
  rangeMs: number,
  fromMs: number,
  containerWidth: number,
): BlockLayout[] {
  const minBlockPx = 8;

  const layouts: BlockLayout[] = recordings
    .map((rec) => {
      const recMs = new Date(rec.timestamp).getTime();
      const position = ((recMs - fromMs) / rangeMs) * 100;
      return { recording: rec, position, stackLevel: 0 };
    })
    .sort((a, b) => a.position - b.position);

  // Assign stack levels using a greedy approach:
  // Track the rightmost pixel edge at each stack level.
  const levelEdges: number[] = [];

  for (const block of layouts) {
    const blockLeftPx = (block.position / 100) * containerWidth;

    // Find the lowest level where this block doesn't overlap
    let assigned = false;
    for (let level = 0; level < levelEdges.length; level++) {
      if (blockLeftPx - levelEdges[level] >= minBlockPx) {
        block.stackLevel = level;
        levelEdges[level] = blockLeftPx;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      block.stackLevel = levelEdges.length;
      levelEdges.push(blockLeftPx);
    }
  }

  return layouts;
}

function getNowPosition(timeRange: TimeRange): number | null {
  const now = Date.now();
  const fromMs = timeRange.from.getTime();
  const toMs = timeRange.to.getTime();
  if (now < fromMs || now > toMs) return null;
  return ((now - fromMs) / (toMs - fromMs)) * 100;
}

/** Pixels per hour of timeline — controls zoom / density */
const PIXELS_PER_HOUR = 120;

/** Minimum interval (ms) between debounced onSelect calls during scrub */
const SCRUB_DEBOUNCE_MS = 100;

export default function TimelineBar({
  timeRange,
  recordings = [],
  selectedRecordingId,
  onSelect,
  centeredRecordingId,
}: TimelineBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Touch pan state (touch still uses drag-to-pan)
  const touchState = useRef<{
    active: boolean;
    startX: number;
    startScroll: number;
    isSwiping: boolean;
  }>({ active: false, startX: 0, startScroll: 0, isSwiping: false });

  const [isDragging, setIsDragging] = useState(false);

  // Scrub state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverTimestamp, setHoverTimestamp] = useState<Date | null>(null);
  const scrubState = useRef<{
    active: boolean;
    lastSelectTime: number;
    lastSelectedId: number | null;
    didScrub: boolean;
  }>({ active: false, lastSelectTime: 0, lastSelectedId: null, didScrub: false });

  const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
  const fromMs = timeRange.from.getTime();
  const rangeHours = rangeMs / (1000 * 60 * 60);
  const trackWidth = Math.max(rangeHours * PIXELS_PER_HOUR, 100);

  const markers = useMemo(() => computeMarkers(timeRange, trackWidth), [timeRange, trackWidth]);
  const nowPosition = useMemo(() => getNowPosition(timeRange), [timeRange]);

  const blockLayouts = useMemo(() => {
    return computeBlockLayouts(recordings, rangeMs, fromMs, trackWidth);
  }, [recordings, rangeMs, fromMs, trackWidth]);

  // Convert vertical mouse wheel to horizontal scroll (pan via scroll wheel)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // If there's meaningful horizontal delta already, let it through
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /**
   * Get the pixel X position relative to the track element from a mouse event.
   */
  const getTrackPixelX = useCallback((clientX: number): number | null => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    return clientX - rect.left;
  }, []);

  /**
   * Perform a scrub selection at the given pixel X on the track.
   * Debounces calls: fires immediately on recording change, otherwise
   * throttles to SCRUB_DEBOUNCE_MS.
   */
  const performScrubSelect = useCallback(
    (pixelX: number, force: boolean = false) => {
      if (!onSelect) return;

      const ts = pixelToTime(pixelX, trackWidth, timeRange);
      const hit = hitTestRecording(ts, recordings);

      if (!hit) return;

      const now = Date.now();
      const state = scrubState.current;
      const recordingChanged = hit.recording.id !== state.lastSelectedId;
      const timeSinceLastSelect = now - state.lastSelectTime;

      if (force || recordingChanged || timeSinceLastSelect >= SCRUB_DEBOUNCE_MS) {
        onSelect(hit.recording);
        state.lastSelectTime = now;
        state.lastSelectedId = hit.recording.id;
      }
    },
    [onSelect, trackWidth, timeRange, recordings],
  );

  // Scrub mousedown: enter scrub mode, immediately select
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't initiate scrub on recording block clicks
      if ((e.target as HTMLElement).closest(".timeline-bar__block")) return;

      const pixelX = getTrackPixelX(e.clientX);
      if (pixelX === null) return;

      scrubState.current = {
        active: true,
        lastSelectTime: 0,
        lastSelectedId: null,
        didScrub: false,
      };
      setIsScrubbing(true);

      // Immediately select at the click position
      performScrubSelect(pixelX, true);
    },
    [getTrackPixelX, performScrubSelect],
  );

  // Global mousemove/mouseup for scrub
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // Update hover indicator regardless of scrub state
      const pixelX = getTrackPixelX(e.clientX);
      if (pixelX !== null) {
        setHoverX(pixelX);
        setHoverTimestamp(pixelToTime(pixelX, trackWidth, timeRange));
      }

      if (!scrubState.current.active) return;

      scrubState.current.didScrub = true;

      if (pixelX !== null) {
        performScrubSelect(pixelX);
      }
    };

    const onMouseUp = () => {
      if (!scrubState.current.active) return;

      scrubState.current.active = false;
      setIsScrubbing(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [getTrackPixelX, performScrubSelect, trackWidth, timeRange]);

  // Touch drag-to-pan handlers (mirrors mouse drag with tap/scroll threshold)
  const TOUCH_DRAG_THRESHOLD = 5;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const touch = e.touches[0];
    touchState.current = {
      active: true,
      startX: touch.clientX,
      startScroll: el.scrollLeft,
      isSwiping: false,
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState.current.active) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchState.current.startX;

      // Once past threshold, mark as swiping and prevent default to avoid page scroll
      if (!touchState.current.isSwiping && Math.abs(dx) > TOUCH_DRAG_THRESHOLD) {
        touchState.current.isSwiping = true;
        setIsDragging(true);
      }

      if (touchState.current.isSwiping) {
        e.preventDefault();
        el.scrollLeft = touchState.current.startScroll - dx;
      }
    };

    const onTouchEnd = () => {
      if (!touchState.current.active) return;
      touchState.current.active = false;
      if (touchState.current.isSwiping) {
        touchState.current.isSwiping = false;
        setIsDragging(false);
      }
      // If isSwiping was never set, the touch was a tap — click events fire naturally
    };

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Auto-scroll to center the specified recording in the viewport
  useEffect(() => {
    if (centeredRecordingId == null) return;
    const el = scrollRef.current;
    if (!el) return;

    const rec = recordings.find((r) => r.id === centeredRecordingId);
    if (!rec) return;

    const recMs = new Date(rec.timestamp).getTime();
    const positionPx = ((recMs - fromMs) / rangeMs) * trackWidth;
    const viewportWidth = el.clientWidth;
    const targetScroll = positionPx - viewportWidth / 2;

    el.scrollTo({ left: targetScroll, behavior: "smooth" });
  }, [centeredRecordingId, recordings, fromMs, rangeMs, trackWidth]);

  // Handle hover enter/leave for the track area
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      const pixelX = getTrackPixelX(e.clientX);
      if (pixelX !== null) {
        setHoverX(pixelX);
        setHoverTimestamp(pixelToTime(pixelX, trackWidth, timeRange));
      }
    },
    [getTrackPixelX, trackWidth, timeRange],
  );

  const handleMouseLeave = useCallback(() => {
    if (!scrubState.current.active) {
      setHoverX(null);
      setHoverTimestamp(null);
    }
  }, []);

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // If we just finished a scrub drag, suppress the click
      if (scrubState.current.didScrub) {
        scrubState.current.didScrub = false;
        return;
      }
      if (!onSelect) return;
      const target = e.target as HTMLElement;
      if (target.closest(".timeline-bar__block")) return;
      // Click on empty area with no scrub: handled by mousedown scrub already
    },
    [onSelect],
  );

  // Compute hover indicator position as a percentage of track width
  const hoverPosition = hoverX !== null ? (hoverX / trackWidth) * 100 : null;

  return (
    <div className="timeline-bar" ref={containerRef} onClick={handleBarClick} role="region" aria-label="Recording timeline">
      <div
        className={`timeline-bar__scroll${isDragging ? " timeline-bar__scroll--dragging" : ""}${isScrubbing ? " timeline-bar__scroll--scrubbing" : ""}`}
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
      <div
        className="timeline-bar__track"
        ref={trackRef}
        style={{ width: `${trackWidth}px` }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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

        {/* Hover / scrub indicator line */}
        {hoverPosition !== null && (
          <div
            className={`timeline-bar__hover-indicator${isScrubbing ? " timeline-bar__hover-indicator--scrubbing" : ""}`}
            style={{ left: `${hoverPosition}%` }}
          >
            {hoverTimestamp !== null && (
              <span className="timeline-bar__hover-tooltip">
                {formatTooltipTime(hoverTimestamp, rangeMs)}
              </span>
            )}
          </div>
        )}

        {/* Recording blocks */}
        {blockLayouts.map(({ recording: rec, position, stackLevel }) => {
          const eventType = rec.event_type || "motion";
          const isSelected = selectedRecordingId === rec.id;
          return (
            <button
              key={rec.id}
              className={`timeline-bar__block timeline-bar__block--${eventType}${isSelected ? " timeline-bar__block--selected" : ""}${stackLevel > 0 ? " timeline-bar__block--stacked" : ""}`}
              style={{
                left: `${position}%`,
                top: `${36 - stackLevel * 10}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(rec);
              }}
              aria-label={`${eventType} event at ${new Date(rec.timestamp).toLocaleTimeString()}`}
              title={`${eventType} — ${new Date(rec.timestamp).toLocaleTimeString()}`}
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
    </div>
  );
}

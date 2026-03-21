import "./TimelineTopBar.css";
import type { TimeRange } from "./TimelineBar";

export type TimePreset = "1h" | "24h" | "7d" | "custom";
export type EventTypeFilter = "" | "doorbell" | "motion";

export interface EventCounts {
  motion: number;
  doorbell: number;
  total: number;
}

interface TimelineTopBarProps {
  cameras: string[];
  selectedCamera: string;
  onCameraChange: (camera: string) => void;
  timePreset: TimePreset;
  onTimePresetChange: (preset: TimePreset) => void;
  timeRange: TimeRange;
  onCustomTimeRangeChange: (range: TimeRange) => void;
  eventType: EventTypeFilter;
  onEventTypeChange: (type: EventTypeFilter) => void;
  counts?: EventCounts | null;
}

const TIME_PRESETS: { value: TimePreset; label: string }[] = [
  { value: "1h", label: "Last Hour" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "custom", label: "Custom" },
];

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TimelineTopBar({
  cameras,
  selectedCamera,
  onCameraChange,
  timePreset,
  onTimePresetChange,
  timeRange,
  onCustomTimeRangeChange,
  eventType,
  onEventTypeChange,
  counts,
}: TimelineTopBarProps) {
  return (
    <div className="timeline-top-bar">
      {/* Left: Event type filters */}
      <div className="timeline-top-bar__section timeline-top-bar__events">
        <button
          className={`timeline-top-bar__event-btn${eventType === "" ? " timeline-top-bar__event-btn--active" : ""}`}
          onClick={() => onEventTypeChange("")}
        >
          All{counts ? ` \u00B7 ${counts.total}` : ""}
        </button>
        <button
          className={`timeline-top-bar__event-btn timeline-top-bar__event-btn--doorbell${eventType === "doorbell" ? " timeline-top-bar__event-btn--active" : ""}`}
          onClick={() => onEventTypeChange("doorbell")}
        >
          Doorbell{counts ? ` \u00B7 ${counts.doorbell}` : ""}
        </button>
        <button
          className={`timeline-top-bar__event-btn timeline-top-bar__event-btn--motion${eventType === "motion" ? " timeline-top-bar__event-btn--active" : ""}`}
          onClick={() => onEventTypeChange("motion")}
        >
          Motion{counts ? ` \u00B7 ${counts.motion}` : ""}
        </button>
      </div>

      {/* Center: Camera selector */}
      <div className="timeline-top-bar__section timeline-top-bar__camera">
        <select
          className="timeline-top-bar__camera-select"
          value={selectedCamera}
          onChange={(e) => onCameraChange(e.target.value)}
          aria-label="Select camera"
        >
          {cameras.length === 0 && <option value="">No cameras</option>}
          {cameras.map((cam) => (
            <option key={cam} value={cam}>
              {cam.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Right: Time range presets */}
      <div className="timeline-top-bar__section timeline-top-bar__time">
        {TIME_PRESETS.map(({ value, label }) => (
          <button
            key={value}
            className={`timeline-top-bar__time-btn${timePreset === value ? " timeline-top-bar__time-btn--active" : ""}`}
            onClick={() => onTimePresetChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date-time range picker */}
      {timePreset === "custom" && (
        <div className="timeline-top-bar__custom-range">
          <label className="timeline-top-bar__custom-label">
            From
            <input
              type="datetime-local"
              className="timeline-top-bar__datetime-input"
              value={toDatetimeLocal(timeRange.from)}
              max={toDatetimeLocal(timeRange.to)}
              onChange={(e) => {
                const from = new Date(e.target.value);
                if (!isNaN(from.getTime())) {
                  onCustomTimeRangeChange({ from, to: timeRange.to });
                }
              }}
            />
          </label>
          <label className="timeline-top-bar__custom-label">
            To
            <input
              type="datetime-local"
              className="timeline-top-bar__datetime-input"
              value={toDatetimeLocal(timeRange.to)}
              min={toDatetimeLocal(timeRange.from)}
              onChange={(e) => {
                const to = new Date(e.target.value);
                if (!isNaN(to.getTime())) {
                  onCustomTimeRangeChange({ from: timeRange.from, to });
                }
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

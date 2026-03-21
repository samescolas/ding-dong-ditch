import "./TimelineTopBar.css";

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

const EVENT_TYPE_LABELS: Record<EventTypeFilter, string> = {
  "": "All",
  doorbell: "Doorbell",
  motion: "Motion",
};

const DEFAULT_CAMERA_INDEX = 0;
const DEFAULT_TIME_PRESET: TimePreset = "24h";
const DEFAULT_EVENT_TYPE: EventTypeFilter = "";

export default function TimelineTopBar({
  cameras,
  selectedCamera,
  onCameraChange,
  timePreset,
  onTimePresetChange,
  eventType,
  onEventTypeChange,
  counts,
}: TimelineTopBarProps) {
  const defaultCamera = cameras[DEFAULT_CAMERA_INDEX] ?? "";
  const isCameraFiltered = selectedCamera !== defaultCamera && selectedCamera !== "";
  const isTimeFiltered = timePreset !== DEFAULT_TIME_PRESET;
  const isEventFiltered = eventType !== DEFAULT_EVENT_TYPE;
  const hasActiveChips = isCameraFiltered || isTimeFiltered || isEventFiltered;

  const timePresetLabel =
    TIME_PRESETS.find((p) => p.value === timePreset)?.label ?? timePreset;

  return (
    <div className="timeline-top-bar-wrapper">
      <div className="timeline-top-bar">
        {/* Left: Event type filters */}
        <div className="timeline-top-bar__section timeline-top-bar__events">
          <button
            className={`timeline-top-bar__event-btn${eventType === "" ? " timeline-top-bar__event-btn--active" : ""}`}
            onClick={() => onEventTypeChange("")}
            aria-label={`Filter by all events${counts ? `, ${counts.total} total` : ""}`}
            aria-pressed={eventType === ""}
          >
            All{counts ? ` \u00B7 ${counts.total}` : ""}
          </button>
          <button
            className={`timeline-top-bar__event-btn timeline-top-bar__event-btn--doorbell${eventType === "doorbell" ? " timeline-top-bar__event-btn--active" : ""}`}
            onClick={() => onEventTypeChange("doorbell")}
            aria-label={`Filter by doorbell events${counts ? `, ${counts.doorbell} total` : ""}`}
            aria-pressed={eventType === "doorbell"}
          >
            Doorbell{counts ? ` \u00B7 ${counts.doorbell}` : ""}
          </button>
          <button
            className={`timeline-top-bar__event-btn timeline-top-bar__event-btn--motion${eventType === "motion" ? " timeline-top-bar__event-btn--active" : ""}`}
            onClick={() => onEventTypeChange("motion")}
            aria-label={`Filter by motion events${counts ? `, ${counts.motion} total` : ""}`}
            aria-pressed={eventType === "motion"}
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
              aria-label={`Show ${label.toLowerCase()}`}
              aria-pressed={timePreset === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveChips && (
        <div className="timeline-top-bar__chips">
          {isCameraFiltered && (
            <span className="chip">
              Camera: {selectedCamera.replace(/_/g, " ")}
              <button
                className="chip__dismiss"
                onClick={() => onCameraChange(defaultCamera)}
                aria-label="Reset camera filter"
              >
                &times;
              </button>
            </span>
          )}
          {isTimeFiltered && (
            <span className="chip">
              Time: {timePresetLabel}
              <button
                className="chip__dismiss"
                onClick={() => onTimePresetChange(DEFAULT_TIME_PRESET)}
                aria-label="Reset time range filter"
              >
                &times;
              </button>
            </span>
          )}
          {isEventFiltered && (
            <span className="chip">
              Event: {EVENT_TYPE_LABELS[eventType]}
              <button
                className="chip__dismiss"
                onClick={() => onEventTypeChange(DEFAULT_EVENT_TYPE)}
                aria-label="Reset event type filter"
              >
                &times;
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

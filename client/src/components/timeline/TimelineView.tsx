import { useTimeline } from "../../hooks/useTimeline";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import TimelineTopBar from "./TimelineTopBar";
import TimelinePlayer from "./TimelinePlayer";
import TimelineBar from "./TimelineBar";

export default function TimelineView() {
  const {
    cameras,
    camera,
    setCamera,
    eventType,
    setEventType,
    timePreset,
    setTimePreset,
    timeRange,
    recordings,
    counts,
    selectedRecording,
    setSelectedRecording,
    loading,
    error,
    reload,
  } = useTimeline();

  useKeyboardShortcuts({ recordings, selectedRecording, setSelectedRecording });

  return (
    <div className="timeline-view">
      <TimelineTopBar
        cameras={cameras}
        selectedCamera={camera}
        onCameraChange={setCamera}
        timePreset={timePreset}
        onTimePresetChange={setTimePreset}
        eventType={eventType as "" | "doorbell" | "motion"}
        onEventTypeChange={setEventType}
        counts={counts}
      />
      <TimelinePlayer
        recording={selectedRecording}
        onPrevious={() => {
          const idx = recordings.findIndex((r) => r.id === selectedRecording?.id);
          if (idx > 0) setSelectedRecording(recordings[idx - 1]);
        }}
        onNext={() => {
          const idx = recordings.findIndex((r) => r.id === selectedRecording?.id);
          if (idx >= 0 && idx < recordings.length - 1) setSelectedRecording(recordings[idx + 1]);
        }}
        onDelete={async (rec) => {
          try {
            const [date, cam, file] = rec.path.split("/");
            await fetch(`/api/recordings/${date}/${cam}/${file}`, { method: "DELETE" });
            setSelectedRecording(null);
            reload();
          } catch {
            // Error handling is in the player component
          }
        }}
      />
      <TimelineBar
        timeRange={timeRange}
        recordings={recordings}
        selectedRecordingId={selectedRecording?.id ?? null}
        onSelect={setSelectedRecording}
      />
    </div>
  );
}

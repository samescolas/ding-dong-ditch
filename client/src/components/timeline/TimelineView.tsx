import { useTimeline } from "../../hooks/useTimeline";
import TimelineTopBar from "./TimelineTopBar";
import TimelinePlayer from "./TimelinePlayer";
import TimelineBar from "./TimelineBar";

export default function TimelineView() {
  const {
    currentTime,
    selectedCamera,
    setSelectedCamera,
    isPlaying,
    cameras,
    play,
    pause,
    seek,
  } = useTimeline();

  return (
    <div className="timeline-view">
      <TimelineTopBar
        selectedCamera={selectedCamera}
        onCameraChange={setSelectedCamera}
        cameras={cameras}
      />
      <TimelinePlayer
        currentTime={currentTime}
        isPlaying={isPlaying}
        onPlay={play}
        onPause={pause}
      />
      <TimelineBar
        currentTime={currentTime}
        onSeek={seek}
      />
    </div>
  );
}

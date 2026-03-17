import type { Recording } from "../../types/recording";
import RecordingCard from "./RecordingCard";

interface RecordingGridProps {
  grouped: Map<string, Recording[]>;
  onPlay: (recording: Recording) => void;
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function RecordingGrid({ grouped, onPlay }: RecordingGridProps) {
  return (
    <div className="recording-grid">
      {Array.from(grouped.entries()).map(([date, recordings]) => (
        <div key={date} style={{ display: "contents" }}>
          <div className="recording-grid__date-header">
            {formatDateHeader(date)}
          </div>
          {recordings.map((rec) => (
            <RecordingCard key={rec.path} recording={rec} onPlay={onPlay} />
          ))}
        </div>
      ))}
    </div>
  );
}

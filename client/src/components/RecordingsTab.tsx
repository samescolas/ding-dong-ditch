import { useState, useEffect, useCallback, useRef } from "react";

interface Recording {
  camera: string;
  date: string;
  file: string;
  path: string;
  size: number;
}

export default function RecordingsTab() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [empty, setEmpty] = useState(false);
  const [playerSrc, setPlayerSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadRecordings = useCallback(async () => {
    try {
      const res = await fetch("/api/recordings");
      const data: Recording[] = await res.json();
      setRecordings(data);
      setEmpty(data.length === 0);
    } catch {
      setEmpty(true);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closePlayer();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function playClip(clipPath: string) {
    setPlayerSrc(`/api/recordings/${clipPath}`);
    setTimeout(() => videoRef.current?.play(), 0);
  }

  function closePlayer() {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    setPlayerSrc(null);
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }

  async function deleteClip(clipPath: string) {
    if (!window.confirm("Delete this recording?")) return;
    try {
      const res = await fetch(`/api/recordings/${clipPath}`, { method: "DELETE" });
      if (res.ok) {
        loadRecordings();
      } else {
        showError("Failed to delete recording.");
      }
    } catch {
      showError("Failed to delete recording.");
    }
  }

  function formatTime(file: string): string {
    return file.replace(".mp4", "").replace(/-/g, ":");
  }

  function formatSize(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1);
  }

  return (
    <div>
      <h2>Recordings</h2>
      {error && <div className="msg error">{error}</div>}
      {empty && <p className="empty">No recordings yet.</p>}
      {recordings.length > 0 && (
        <ul className="clip-list">
          {recordings.map((clip) => (
            <li key={clip.path}>
              <div className="clip-info">
                <span className="camera">{clip.camera}</span>{" "}
                <span className="time">{clip.date} {formatTime(clip.file)}</span>{" "}
                <span className="size">{formatSize(clip.size)} MB</span>
              </div>
              <div>
                <button className="primary" onClick={() => playClip(clip.path)}>
                  Play
                </button>
                <button
                  className="danger"
                  style={{ marginLeft: "0.25rem" }}
                  onClick={() => deleteClip(clip.path)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {playerSrc && (
        <div>
          <video ref={videoRef} controls src={playerSrc} />
        </div>
      )}
    </div>
  );
}

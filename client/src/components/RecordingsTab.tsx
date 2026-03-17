import { useState, useEffect, useCallback, useRef } from "react";

interface Recording {
  id: number;
  camera: string;
  date: string;
  file: string;
  path: string;
  size: number;
  snapshot_key: string | null;
  description: string | null;
}

interface PaginatedResult {
  data: Recording[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 20;

export default function RecordingsTab() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [cameras, setCameras] = useState<string[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [empty, setEmpty] = useState(false);
  const [playerSrc, setPlayerSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch camera list for filter dropdown
  useEffect(() => {
    fetch("/api/recordings/cameras")
      .then((res) => res.json())
      .then((data: string[]) => setCameras(data))
      .catch(() => {});
  }, []);

  const loadRecordings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCamera) params.set("camera", selectedCamera);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));

      const res = await fetch(`/api/recordings?${params}`);
      const result: PaginatedResult = await res.json();
      setRecordings(result.data);
      setTotal(result.total);
      setEmpty(result.total === 0);
    } catch {
      setEmpty(true);
    }
  }, [selectedCamera, dateFrom, dateTo, searchQuery, page]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Debounce search input
  function handleSearchInput(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(0);
    }, 300);
  }

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

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showingFrom = total > 0 ? page * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div>
      <h2>Recordings</h2>
      {error && <div className="msg error">{error}</div>}

      <div className="filters" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <select
          value={selectedCamera}
          onChange={(e) => { setSelectedCamera(e.target.value); setPage(0); }}
        >
          <option value="">All cameras</option>
          {cameras.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          placeholder="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          placeholder="To date"
        />

        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Search descriptions..."
          style={{ flex: 1, minWidth: "150px" }}
        />
      </div>

      {empty && <p className="empty">No recordings found.</p>}

      {recordings.length > 0 && (
        <>
          <ul className="clip-list">
            {recordings.map((clip) => (
              <li key={clip.path}>
                <div className="clip-info">
                  <span className="camera">{clip.camera}</span>{" "}
                  <span className="time">{clip.date} {formatTime(clip.file)}</span>{" "}
                  <span className="size">{formatSize(clip.size)} MB</span>
                  {clip.description && (
                    <div className="description" style={{ fontSize: "0.85em", opacity: 0.8, marginTop: "0.25rem" }}>
                      {clip.description}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  {clip.snapshot_key && (
                    <img
                      src={`/api/recordings/${clip.snapshot_key}`}
                      alt="snapshot"
                      style={{ width: "48px", height: "36px", objectFit: "cover", borderRadius: "4px" }}
                    />
                  )}
                  <button className="primary" onClick={() => playClip(clip.path)}>
                    Play
                  </button>
                  <button
                    className="danger"
                    onClick={() => deleteClip(clip.path)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
            <span style={{ fontSize: "0.85em", opacity: 0.7 }}>
              Showing {showingFrom}–{showingTo} of {total}
            </span>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {playerSrc && (
        <div>
          <video ref={videoRef} controls src={playerSrc} />
        </div>
      )}
    </div>
  );
}

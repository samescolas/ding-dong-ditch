import { useState, useEffect, useCallback } from "react";

interface CameraConfig {
  enabled: boolean;
  recordingDuration: number;
  cooldownSeconds: number;
}

interface Camera {
  id: string;
  name: string;
  config: CameraConfig;
}

interface CamerasTabProps {
  connected: boolean;
}

function CameraCard({ camera }: { camera: Camera }) {
  const [enabled, setEnabled] = useState(camera.config.enabled);
  const [recordingDuration, setRecordingDuration] = useState(camera.config.recordingDuration);
  const [cooldownSeconds, setCooldownSeconds] = useState(camera.config.cooldownSeconds);
  const [saveText, setSaveText] = useState("Save");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    try {
      const res = await fetch(`/api/cameras/${camera.id}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, recordingDuration, cooldownSeconds }),
      });
      if (res.ok) {
        setSaveText("Saved!");
        setTimeout(() => setSaveText("Save"), 1500);
      } else {
        setError("Failed to save settings.");
        setTimeout(() => setError(null), 4000);
      }
    } catch {
      setError("Failed to save settings.");
      setTimeout(() => setError(null), 4000);
    }
  }

  return (
    <div className="card">
      {error && <div className="msg error">{error}</div>}
      <div className="cam-header">
        <h3>{camera.name}</h3>
        <label className="toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="slider" />
        </label>
      </div>
      <div className="cam-fields">
        <div>
          <label>Recording Duration (s)</label>
          <input
            type="number"
            value={recordingDuration}
            min={10}
            max={600}
            onChange={(e) => setRecordingDuration(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div>
          <label>Cooldown (s)</label>
          <input
            type="number"
            value={cooldownSeconds}
            min={0}
            max={600}
            onChange={(e) => setCooldownSeconds(parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>
      <button className="primary save-cam" onClick={handleSave}>
        {saveText}
      </button>
    </div>
  );
}

export default function CamerasTab({ connected }: CamerasTabProps) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [empty, setEmpty] = useState(false);

  const loadCameras = useCallback(async () => {
    try {
      const res = await fetch("/api/cameras");
      const data: Camera[] = await res.json();
      setCameras(data);
      setEmpty(data.length === 0);
    } catch {
      setEmpty(true);
    }
  }, []);

  useEffect(() => {
    if (connected) {
      loadCameras();
    }
  }, [connected, loadCameras]);

  if (!connected) {
    return (
      <div>
        <h2>Cameras</h2>
        <p className="empty">Connect your Ring account first.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Cameras</h2>
      {empty && <p className="empty">No cameras found. Check your Ring connection.</p>}
      {cameras.map((cam) => (
        <CameraCard key={cam.id} camera={cam} />
      ))}
    </div>
  );
}

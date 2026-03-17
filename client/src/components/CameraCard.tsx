import { useState } from "react";
import { useToast } from "../contexts/ToastContext";

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

export default function CameraCard({ camera }: { camera: Camera }) {
  const [enabled, setEnabled] = useState(camera.config.enabled);
  const [recordingDuration, setRecordingDuration] = useState(camera.config.recordingDuration);
  const [cooldownSeconds, setCooldownSeconds] = useState(camera.config.cooldownSeconds);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cameras/${camera.id}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, recordingDuration, cooldownSeconds }),
      });
      if (res.ok) {
        showToast(`${camera.name} settings saved.`, "success");
      } else {
        showToast("Failed to save settings.", "error");
      }
    } catch {
      showToast("Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card camera-card">
      <div className="camera-card__header">
        <div className="camera-card__name-row">
          <span className={`status-dot ${enabled ? "status-dot--connected" : "status-dot--disconnected"}`} />
          <h3 className="camera-card__name">{camera.name}</h3>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            aria-label={`Enable ${camera.name}`}
          />
          <span className="slider" />
        </label>
      </div>

      <div className="camera-card__fields">
        <div>
          <label htmlFor={`dur-${camera.id}`}>Duration (s)</label>
          <input
            type="number"
            id={`dur-${camera.id}`}
            value={recordingDuration}
            min={10}
            max={600}
            onChange={(e) => setRecordingDuration(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div>
          <label htmlFor={`cd-${camera.id}`}>Cooldown (s)</label>
          <input
            type="number"
            id={`cd-${camera.id}`}
            value={cooldownSeconds}
            min={0}
            max={600}
            onChange={(e) => setCooldownSeconds(parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>

      <button className="btn btn-primary camera-card__save" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

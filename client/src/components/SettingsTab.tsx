import { useState, useEffect } from "react";
import { api } from "../hooks/useApi";

interface Config {
  recordingDuration: number;
  cooldownSeconds: number;
  retentionDays: number;
}

interface MsgState {
  text: string;
  type: "error" | "success";
}

export default function SettingsTab() {
  const [duration, setDuration] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [retention, setRetention] = useState(0);
  const [msg, setMsg] = useState<MsgState | null>(null);

  function showMessage(text: string, type: "error" | "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api<Config>("/api/config");
        setDuration(data.recordingDuration);
        setCooldown(data.cooldownSeconds);
        setRetention(data.retentionDays);
      } catch {
        // silently fail
      }
    }
    loadSettings();
  }, []);

  async function handleSave() {
    try {
      await api("/api/config", {
        method: "PUT",
        body: JSON.stringify({
          recordingDuration: duration,
          cooldownSeconds: cooldown,
          retentionDays: retention,
        }),
      });
      showMessage("Settings saved.", "success");
    } catch (e) {
      showMessage((e as Error).message, "error");
    }
  }

  return (
    <div>
      <h2>Default Settings</h2>
      <div className="card">
        {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
        <div className="cam-fields">
          <div>
            <label htmlFor="default-duration">Recording Duration (s)</label>
            <input
              type="number"
              id="default-duration"
              min={10}
              max={600}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div>
            <label htmlFor="default-cooldown">Cooldown (s)</label>
            <input
              type="number"
              id="default-cooldown"
              min={0}
              max={600}
              value={cooldown}
              onChange={(e) => setCooldown(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div>
            <label htmlFor="default-retention">Retention (days)</label>
            <input
              type="number"
              id="default-retention"
              min={0}
              value={retention}
              onChange={(e) => setRetention(parseInt(e.target.value, 10) || 0)}
            />
            <p style={{ fontSize: "0.75rem", color: "#8b949e", marginTop: "0.15rem" }}>
              0 = keep forever
            </p>
          </div>
        </div>
        <button className="primary" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}

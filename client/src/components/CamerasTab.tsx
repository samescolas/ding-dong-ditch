import { useState, useEffect, useCallback } from "react";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";
import CameraCard from "./CameraCard";

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
        <PageHeader title="Cameras" />
        <EmptyState
          title="Not connected"
          subtitle="Connect your Ring account first to manage cameras."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Cameras" subtitle={cameras.length > 0 ? `${cameras.length} camera${cameras.length !== 1 ? "s" : ""} detected` : undefined} />
      {empty && (
        <EmptyState
          title="No cameras found"
          subtitle="Check your Ring connection and try again."
        />
      )}
      <div className="cameras-grid">
        {cameras.map((cam) => (
          <CameraCard key={cam.id} camera={cam} />
        ))}
      </div>
    </div>
  );
}

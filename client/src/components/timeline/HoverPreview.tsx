import { useState } from "react";
import type { Recording } from "../../types/recording";

interface HoverPreviewProps {
  recording: Recording;
}

export default function HoverPreview({ recording }: HoverPreviewProps) {
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">(
    recording.snapshot_key ? "loading" : "error"
  );

  const showPlaceholder = !recording.snapshot_key || imgStatus === "error";

  return (
    <div className="hover-preview">
      <div className="hover-preview__thumbnail">
        {recording.snapshot_key && imgStatus !== "error" && (
          <img
            className={`hover-preview__img${imgStatus === "loading" ? " hover-preview__img--loading" : ""}`}
            src={`/api/recordings/${recording.snapshot_key}`}
            alt={`Snapshot from ${recording.camera}`}
            width={120}
            height={80}
            onLoad={() => setImgStatus("loaded")}
            onError={() => setImgStatus("error")}
          />
        )}
        {imgStatus === "loading" && (
          <div className="hover-preview__shimmer" aria-hidden="true" />
        )}
        {showPlaceholder && (
          <div className="hover-preview__placeholder" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}
      </div>
      <div className="hover-preview__info">
        <span className="hover-preview__camera">{recording.camera}</span>
        {recording.event_type && (
          <span className="hover-preview__event">{recording.event_type}</span>
        )}
      </div>
    </div>
  );
}

import { useState, useRef, useCallback } from "react";

interface TimelinePlayerProps {
  src: string;
  poster?: string;
}

type PlayerState = "idle" | "loading" | "ready" | "error";

export default function TimelinePlayer({ src, poster }: TimelinePlayerProps) {
  const [state, setState] = useState<PlayerState>("idle");
  const [errorDetail, setErrorDetail] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoadStart = useCallback(() => {
    setState("loading");
    setErrorDetail("");
  }, []);

  const handleCanPlay = useCallback(() => {
    setState("ready");
  }, []);

  const handleError = useCallback(() => {
    const video = videoRef.current;
    let detail = "Failed to load video.";

    if (video?.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          detail = "Video playback was aborted.";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          detail = "A network error prevented the video from loading.";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          detail = "The video format is not supported or the file is corrupted.";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          detail = "The video source is not available or the format is unsupported.";
          break;
      }
    }

    setState("error");
    setErrorDetail(detail);
  }, []);

  const handleRetry = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setState("loading");
      setErrorDetail("");
      video.load();
    }
  }, []);

  return (
    <div className="timeline-player">
      {state === "error" ? (
        <div className="timeline-player__error" role="alert">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
            <line x1="17" y1="17" x2="22" y2="17" />
          </svg>
          <p className="timeline-player__error-text">{errorDetail}</p>
          <button className="btn" onClick={handleRetry}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Retry
          </button>
        </div>
      ) : (
        <>
          {state === "loading" && (
            <div className="timeline-player__loading">
              <div className="timeline-player__spinner" />
            </div>
          )}
          <video
            ref={videoRef}
            className="timeline-player__video"
            src={src}
            poster={poster}
            controls
            preload="metadata"
            onLoadStart={handleLoadStart}
            onCanPlay={handleCanPlay}
            onError={handleError}
          />
        </>
      )}
    </div>
  );
}

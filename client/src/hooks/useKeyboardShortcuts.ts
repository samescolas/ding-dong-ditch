import { useEffect, useCallback } from "react";
import type { TimelineRecording } from "../components/timeline/TimelineBar";

const INTERACTIVE_ELEMENTS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

interface UseKeyboardShortcutsOptions {
  recordings: TimelineRecording[];
  selectedRecording: TimelineRecording | null;
  setSelectedRecording: (recording: TimelineRecording | null) => void;
}

/**
 * Keyboard shortcuts for timeline navigation.
 *
 * - ArrowLeft:  select previous recording (by timestamp order)
 * - ArrowRight: select next recording
 * - Space:      toggle video play/pause
 * - Escape:     clear selection (deselect recording)
 *
 * Shortcuts are suppressed when focus is inside an input, textarea, or select
 * so that normal text editing is not interrupted.
 */
export function useKeyboardShortcuts({
  recordings,
  selectedRecording,
  setSelectedRecording,
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip when the user is typing in a form control
      const tag = (event.target as HTMLElement)?.tagName;
      if (INTERACTIVE_ELEMENTS.has(tag)) return;

      // Also skip if the target is contentEditable
      if ((event.target as HTMLElement)?.isContentEditable) return;

      switch (event.key) {
        case "ArrowLeft": {
          event.preventDefault();
          if (recordings.length === 0) return;
          if (!selectedRecording) {
            // Select the last recording (most recent at end)
            setSelectedRecording(recordings[recordings.length - 1]);
            return;
          }
          const prevIdx = recordings.findIndex((r) => r.id === selectedRecording.id);
          if (prevIdx > 0) {
            setSelectedRecording(recordings[prevIdx - 1]);
          }
          break;
        }

        case "ArrowRight": {
          event.preventDefault();
          if (recordings.length === 0) return;
          if (!selectedRecording) {
            // Select the first recording (oldest)
            setSelectedRecording(recordings[0]);
            return;
          }
          const nextIdx = recordings.findIndex((r) => r.id === selectedRecording.id);
          if (nextIdx >= 0 && nextIdx < recordings.length - 1) {
            setSelectedRecording(recordings[nextIdx + 1]);
          }
          break;
        }

        case " ": {
          event.preventDefault();
          const video = document.querySelector<HTMLVideoElement>(
            ".timeline-player video",
          );
          if (!video) return;
          if (video.paused) {
            video.play().catch(() => {
              // autoplay may be blocked; ignore
            });
          } else {
            video.pause();
          }
          break;
        }

        case "Escape": {
          setSelectedRecording(null);
          break;
        }

        default:
          break;
      }
    },
    [recordings, selectedRecording, setSelectedRecording],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}

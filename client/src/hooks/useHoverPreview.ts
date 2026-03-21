import { useState, useRef, useCallback } from "react";

export interface TimelineRecording {
  id: number;
  timestamp: string;
  event_type: string | null;
  snapshot_key: string | null;
  path: string;
}

export interface HoverPosition {
  x: number;
  y: number;
}

const SHOW_DELAY_MS = 200;

export function useHoverPreview() {
  const [hoveredRecording, setHoveredRecording] = useState<TimelineRecording | null>(null);
  const [hoverPosition, setHoverPosition] = useState<HoverPosition>({ x: 0, y: 0 });

  const showTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingRecordingRef = useRef<TimelineRecording | null>(null);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current !== undefined) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = undefined;
    }
  }, []);

  const onBlockMouseEnter = useCallback(
    (recording: TimelineRecording, event: React.MouseEvent) => {
      const position = { x: event.clientX, y: event.clientY };

      // If hovering a different block while one is already visible, switch immediately
      // to prevent flickering when moving between adjacent blocks
      if (hoveredRecording !== null && hoveredRecording.id !== recording.id) {
        clearShowTimer();
        setHoveredRecording(recording);
        setHoverPosition(position);
        return;
      }

      // If re-entering the same block that is already shown, just cancel any pending hide
      if (hoveredRecording !== null && hoveredRecording.id === recording.id) {
        clearShowTimer();
        setHoverPosition(position);
        return;
      }

      // New hover from no preview visible: debounce the show
      pendingRecordingRef.current = recording;
      setHoverPosition(position);
      clearShowTimer();

      showTimerRef.current = setTimeout(() => {
        setHoveredRecording(pendingRecordingRef.current);
        showTimerRef.current = undefined;
      }, SHOW_DELAY_MS);
    },
    [hoveredRecording, clearShowTimer],
  );

  const onBlockMouseLeave = useCallback(() => {
    clearShowTimer();
    pendingRecordingRef.current = null;
    setHoveredRecording(null);
  }, [clearShowTimer]);

  return {
    hoveredRecording,
    hoverPosition,
    onBlockMouseEnter,
    onBlockMouseLeave,
  };
}

import { useState, useEffect, useCallback, useRef } from "react";

export interface TimelineEvent {
  id: number;
  camera: string;
  timestamp: string;
  path: string;
  event_type: string | null;
  description: string | null;
}

export interface TimelineData {
  events: TimelineEvent[];
  date: string;
}

interface UseTimelineOptions {
  date: string;
  camera?: string;
}

const TIMEOUT_MS = 15_000;

export function useTimeline({ date, camera }: UseTimelineOptions) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadTimeline = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    setIsLoading(true);
    setError(null);

    let didError = false;

    try {
      const params = new URLSearchParams({ date });
      if (camera) params.set("camera", camera);

      const res = await fetch(`/api/timeline?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as Record<string, string>).error ||
            `Failed to load timeline (${res.status})`
        );
      }

      const result: TimelineData = await res.json();
      setData(result);
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") {
        // If a newer request replaced this one, bail silently
        if (abortRef.current !== controller) {
          return;
        }
        setError("Request timed out. Check your network connection and try again.");
      } else {
        setError(err.message || "Failed to load timeline.");
      }
      setData(null);
      didError = true;
    } finally {
      clearTimeout(timeoutId);
      // Only update loading if this is still the active request
      if (abortRef.current === controller || didError) {
        setIsLoading(false);
      }
    }
  }, [date, camera]);

  useEffect(() => {
    loadTimeline();
    return () => abortRef.current?.abort();
  }, [loadTimeline]);

  return {
    data,
    isLoading,
    error,
    retry: loadTimeline,
  };
}

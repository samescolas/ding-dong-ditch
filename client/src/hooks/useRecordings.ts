import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Recording, PaginatedResult, RecordingFilters } from "../types/recording";
import { CAMERA_STORAGE_KEY } from "./useTimeline";

const PAGE_SIZE = 20;

export function useRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [cameras, setCameras] = useState<string[]>([]);
  const [filters, setFilters] = useState<RecordingFilters>(() => ({
    camera: localStorage.getItem(CAMERA_STORAGE_KEY) ?? "",
    dateFrom: "",
    dateTo: "",
    search: "",
    eventType: "",
  }));
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch camera list; validate persisted camera against available cameras
  useEffect(() => {
    fetch("/api/recordings/cameras")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch cameras");
        return res.json();
      })
      .then((data: string[]) => {
        setCameras(data);
        // If persisted camera is not in the available list, clear the filter
        const saved = localStorage.getItem(CAMERA_STORAGE_KEY);
        if (saved && !data.includes(saved)) {
          setFilters((prev) => ({ ...prev, camera: "" }));
        }
      })
      .catch((err: Error) => console.warn("[recordings] camera list unavailable:", err.message));
  }, []);

  const loadRecordings = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.camera) params.set("camera", filters.camera);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.search) params.set("search", filters.search);
      if (filters.eventType) params.set("eventType", filters.eventType);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));

      const res = await fetch(`/api/recordings?${params}`, { signal: controller.signal });
      const result: PaginatedResult = await res.json();
      setRecordings(result.data);
      setTotal(result.total);
      // Auto-correct stale page: if this page is empty but recordings exist, jump to last valid page
      if (result.data.length === 0 && result.total > 0 && page > 0) {
        setPage(Math.max(0, Math.ceil(result.total / PAGE_SIZE) - 1));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("Failed to load recordings.");
        setRecordings([]);
        setTotal(0);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [filters, page]);

  useEffect(() => {
    loadRecordings();
    return () => abortRef.current?.abort();
  }, [loadRecordings]);

  // Persist camera filter to localStorage so timeline view picks it up
  useEffect(() => {
    if (filters.camera) {
      localStorage.setItem(CAMERA_STORAGE_KEY, filters.camera);
    }
  }, [filters.camera]);

  const updateFilter = useCallback((key: keyof RecordingFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ camera: "", dateFrom: "", dateTo: "", search: "", eventType: "" });
    setSearchInput("");
    setPage(0);
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateFilter("search", value);
      }, 300);
    },
    [updateFilter],
  );

  const deleteRecording = useCallback(
    async (clipPath: string) => {
      // Optimistic removal
      setRecordings((prev) => prev.filter((r) => r.path !== clipPath));
      setTotal((prev) => prev - 1);
      try {
        const res = await fetch(`/api/recordings/${clipPath}`, { method: "DELETE" });
        if (!res.ok) {
          throw new Error("Failed to delete recording.");
        }
      } catch {
        loadRecordings(); // single call, only on failure
        throw new Error("Failed to delete recording.");
      }
      loadRecordings(); // sync with server after success
    },
    [loadRecordings],
  );

  const deleteRecordings = useCallback(
    async (paths: string[]) => {
      // Optimistic removal
      setRecordings((prev) => prev.filter((r) => !paths.includes(r.path)));
      setTotal((prev) => prev - paths.length);
      try {
        const res = await fetch("/api/recordings/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths }),
        });
        if (!res.ok) {
          throw new Error("Bulk delete failed");
        }
      } catch {
        loadRecordings(); // revert optimistic update on failure
        throw new Error("Bulk delete failed");
      }
      loadRecordings(); // sync with server after success
    },
    [loadRecordings],
  );

  const hasActiveFilters = filters.camera || filters.dateFrom || filters.dateTo || filters.search || filters.eventType;

  const grouped = useMemo(() => {
    const map = new Map<string, Recording[]>();
    for (const rec of recordings) {
      const group = map.get(rec.date) || [];
      group.push(rec);
      map.set(rec.date, group);
    }
    return map;
  }, [recordings]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showingFrom = total > 0 ? page * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, total);

  return {
    recordings,
    total,
    page,
    setPage,
    totalPages,
    showingFrom,
    showingTo,
    cameras,
    filters,
    searchInput,
    updateFilter,
    clearFilters,
    handleSearchInput,
    hasActiveFilters,
    isLoading,
    error,
    grouped,
    deleteRecording,
    deleteRecordings,
    reload: loadRecordings,
  };
}

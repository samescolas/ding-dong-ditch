import { useState } from "react";
import { useRecordings } from "../hooks/useRecordings";
import { useToast } from "../contexts/ToastContext";
import type { Recording } from "../types/recording";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";
import ConfirmDialog from "./ConfirmDialog";
import FilterBar from "./recordings/FilterBar";
import RecordingGrid from "./recordings/RecordingGrid";
import RecordingModal from "./recordings/RecordingModal";
import Pagination from "./recordings/Pagination";
import SkeletonGrid from "./recordings/SkeletonGrid";

export default function RecordingsTab() {
  const {
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
    grouped,
    deleteRecording,
    reload,
  } = useRecordings();

  const { showToast } = useToast();
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isRedescribing, setIsRedescribing] = useState(false);

  const handleRedescribe = async () => {
    setIsRedescribing(true);
    try {
      const res = await fetch("/api/recordings/redescribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });
      if (res.status === 400) {
        showToast("AI is not enabled.", "error");
        return;
      }
      if (res.status === 409) {
        showToast("Re-describe already in progress.", "info");
        return;
      }
      if (!res.ok) {
        showToast("Failed to re-describe recordings.", "error");
        return;
      }
      const result = await res.json();
      if (result.total === 0) {
        showToast("All recordings already have descriptions.", "info");
      } else {
        showToast(
          `Described ${result.succeeded} of ${result.processed} recordings.`,
          result.succeeded > 0 ? "success" : "error"
        );
      }
      reload();
    } catch {
      showToast("Failed to re-describe recordings.", "error");
    } finally {
      setIsRedescribing(false);
    }
  };

  const handleDelete = async (path: string) => {
    setConfirmDelete(path);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await deleteRecording(confirmDelete);
      showToast("Recording deleted.", "success");
    } catch {
      showToast("Failed to delete recording.", "error");
    }
    setConfirmDelete(null);
  };

  return (
    <div className="recordings-page">
      <PageHeader
        title="Recordings"
        subtitle={total > 0 ? `${total} recording${total !== 1 ? "s" : ""}` : undefined}
        action={
          total > 0 ? (
            <button
              className="btn"
              onClick={handleRedescribe}
              disabled={isRedescribing}
            >
              {isRedescribing ? "Re-describing..." : "Re-describe"}
            </button>
          ) : undefined
        }
      />

      <FilterBar
        cameras={cameras}
        filters={filters}
        searchInput={searchInput}
        onFilterChange={updateFilter}
        onSearchInput={handleSearchInput}
        onClearFilters={clearFilters}
        hasActiveFilters={!!hasActiveFilters}
      />

      {isLoading ? (
        <SkeletonGrid />
      ) : grouped.size === 0 ? (
        <EmptyState
          title="No recordings found"
          subtitle={hasActiveFilters ? "Try adjusting your filters or search query." : "Recordings will appear here when motion is detected."}
          action={
            hasActiveFilters ? (
              <button className="btn" onClick={clearFilters}>Clear filters</button>
            ) : undefined
          }
        />
      ) : (
        <>
          <RecordingGrid grouped={grouped} onPlay={setSelectedRecording} />
          <Pagination
            showingFrom={showingFrom}
            showingTo={showingTo}
            total={total}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {selectedRecording && (
        <RecordingModal
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
          onDelete={handleDelete}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Recording"
          message="Are you sure you want to delete this recording? This action cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

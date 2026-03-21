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
    grouped,
    deleteRecording,
    deleteRecordings,
    reload,
  } = useRecordings();

  const { showToast } = useToast();
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isRedescribing, setIsRedescribing] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const toggleSelect = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPaths(new Set(recordings.map((r) => r.path)));
  };

  const clearSelection = () => {
    setSelectedPaths(new Set());
    setIsSelectMode(false);
  };

  const handleBulkDelete = async () => {
    const paths = Array.from(selectedPaths);
    clearSelection();
    try {
      await deleteRecordings(paths);
      showToast(`Deleted ${paths.length} recording${paths.length !== 1 ? "s" : ""}.`, "success");
    } catch {
      showToast("Failed to delete some recordings.", "error");
    }
  };

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
          <div className="page-header__actions">
            <button
              className="btn btn-ghost view-toggle"
              onClick={() => { window.location.hash = "recordings"; }}
            >
              Timeline
            </button>
            {total > 0 && (
              isSelectMode ? (
                <button className="btn" onClick={clearSelection}>Cancel</button>
              ) : (
                <>
                  <button
                    className="btn"
                    onClick={handleRedescribe}
                    disabled={isRedescribing}
                  >
                    {isRedescribing ? "Re-describing..." : "Re-describe"}
                  </button>
                  <button className="btn" onClick={() => setIsSelectMode(true)}>Select</button>
                </>
              )
            )}
          </div>
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

      {isSelectMode && (
        <div className="selection-bar">
          <span className="selection-bar__count">{selectedPaths.size} selected</span>
          <button className="btn btn-sm" onClick={selectAll}>Select all ({recordings.length})</button>
          <button
            className="btn btn-danger btn-sm"
            disabled={selectedPaths.size === 0}
            onClick={() => setConfirmBulkDelete(true)}
          >
            Delete selected
          </button>
        </div>
      )}

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
          <RecordingGrid
            grouped={grouped}
            onPlay={setSelectedRecording}
            isSelectMode={isSelectMode}
            selectedPaths={selectedPaths}
            onToggleSelect={toggleSelect}
          />
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

      {selectedRecording && !isSelectMode && (
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

      {confirmBulkDelete && (
        <ConfirmDialog
          title="Delete Recordings"
          message={`Are you sure you want to delete ${selectedPaths.size} recording${selectedPaths.size !== 1 ? "s" : ""}? This action cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { setConfirmBulkDelete(false); handleBulkDelete(); }}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}
    </div>
  );
}

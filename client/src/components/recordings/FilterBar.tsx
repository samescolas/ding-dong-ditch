import { useState } from "react";
import type { RecordingFilters } from "../../types/recording";

interface FilterBarProps {
  cameras: string[];
  filters: RecordingFilters;
  searchInput: string;
  onFilterChange: (key: keyof RecordingFilters, value: string) => void;
  onSearchInput: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export default function FilterBar({
  cameras,
  filters,
  searchInput,
  onFilterChange,
  onSearchInput,
  onClearFilters,
  hasActiveFilters,
}: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount =
    (filters.camera ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <div>
      <div className="filter-bar">
        {/* Mobile toggle */}
        <div className="filter-bar__mobile-toggle">
          <button
            className="btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h18M3 12h18M3 20h18" />
            </svg>
            Filters
            {activeCount > 0 && <span className="filter-bar__count">{activeCount}</span>}
          </button>
        </div>

        <div className={`filter-bar__fields${mobileOpen ? " filter-bar__fields--open" : ""}`}>
          {/* Search */}
          <div className="filter-bar__search">
            <svg className="filter-bar__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="input filter-bar__search-input"
              value={searchInput}
              onChange={(e) => onSearchInput(e.target.value)}
              placeholder="Search descriptions..."
              aria-label="Search recordings"
            />
          </div>

          {/* Camera select */}
          <div className="filter-bar__group">
            <label className="filter-bar__label">Camera</label>
            <select
              value={filters.camera}
              onChange={(e) => onFilterChange("camera", e.target.value)}
              aria-label="Filter by camera"
            >
              <option value="">All cameras</option>
              {cameras.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="filter-bar__group">
            <label className="filter-bar__label">From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange("dateFrom", e.target.value)}
              aria-label="Filter from date"
            />
          </div>
          <div className="filter-bar__group">
            <label className="filter-bar__label">To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFilterChange("dateTo", e.target.value)}
              aria-label="Filter to date"
            />
          </div>
        </div>
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="filter-bar__pills">
          {filters.camera && (
            <span className="chip">
              Camera: {filters.camera}
              <button className="chip__dismiss" onClick={() => onFilterChange("camera", "")} aria-label="Remove camera filter">&times;</button>
            </span>
          )}
          {filters.dateFrom && (
            <span className="chip">
              From: {filters.dateFrom}
              <button className="chip__dismiss" onClick={() => onFilterChange("dateFrom", "")} aria-label="Remove from date filter">&times;</button>
            </span>
          )}
          {filters.dateTo && (
            <span className="chip">
              To: {filters.dateTo}
              <button className="chip__dismiss" onClick={() => onFilterChange("dateTo", "")} aria-label="Remove to date filter">&times;</button>
            </span>
          )}
          {filters.search && (
            <span className="chip">
              Search: "{filters.search}"
              <button className="chip__dismiss" onClick={() => { onFilterChange("search", ""); onSearchInput(""); }} aria-label="Remove search filter">&times;</button>
            </span>
          )}
          <button className="filter-bar__clear" onClick={onClearFilters}>Clear all</button>
        </div>
      )}
    </div>
  );
}

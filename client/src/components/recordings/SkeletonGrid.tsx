export default function SkeletonGrid() {
  return (
    <div className="skeleton-grid" aria-label="Loading recordings" role="status">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-card__thumb skeleton" />
          <div className="skeleton-card__body">
            <div className="skeleton-card__line skeleton" />
            <div className="skeleton-card__line skeleton skeleton-card__line--short" />
            <div className="skeleton-card__line skeleton skeleton-card__line--tiny" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading recordings...</span>
    </div>
  );
}

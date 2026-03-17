interface PaginationProps {
  showingFrom: number;
  showingTo: number;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  showingFrom,
  showingTo,
  total,
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className="pagination">
      <span className="pagination__info">
        Showing {showingFrom}&ndash;{showingTo} of {total}
      </span>
      <div className="pagination__buttons">
        <button
          className="btn btn-ghost"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          Previous
        </button>
        <button
          className="btn btn-ghost"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}

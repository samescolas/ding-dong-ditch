export default function TimelineTopBar() {
  return (
    <div className="timeline-top-bar">
      <div className="timeline-top-bar__filters">
        {/* Filter controls will be added in a future task */}
      </div>
      <button
        className="btn btn-ghost view-toggle"
        onClick={() => { window.location.hash = "recordings/all"; }}
      >
        View All
      </button>
    </div>
  );
}

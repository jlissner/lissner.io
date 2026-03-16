interface HomePageToolbarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSearch: () => void;
  searching: boolean;
  onIndex: (force: boolean) => void;
  indexPolling: boolean;
  indexStatus: string | null;
  indexProgress: { processed: number; total: number } | null;
  indexElapsed: number | null;
}

export function HomePageToolbar({
  searchQuery,
  setSearchQuery,
  onSearch,
  searching,
  onIndex,
  indexPolling,
  indexStatus,
  indexProgress,
  indexElapsed,
}: HomePageToolbarProps) {
  const statusClass =
    indexStatus?.startsWith("Indexed")
      ? "toolbar__status--success"
      : indexStatus?.startsWith("Indexing")
        ? "toolbar__status--primary"
        : "toolbar__status--danger";

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search your media…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          className="form__input toolbar__search"
        />
        <button
          type="button"
          className="btn btn--primary"
          onClick={onSearch}
          disabled={searching}
        >
          {searching ? "Searching…" : "Search"}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => onIndex(false)}
          disabled={indexPolling}
        >
          Index for AI search
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => onIndex(true)}
          disabled={indexPolling}
          title="Re-index all files (including already indexed)"
        >
          Re-index all
        </button>
      </div>
      {indexStatus && (
        <p className={`toolbar__status ${statusClass}`}>
          {indexStatus}
          {indexProgress && indexProgress.total > 0 && (
            <span style={{ marginLeft: 8, opacity: 0.9 }}>{indexProgress.processed}/{indexProgress.total}</span>
          )}
          {indexElapsed !== null && (
            <span style={{ marginLeft: 8, opacity: 0.9 }}>
              ({Math.floor(indexElapsed / 60)}:{String(indexElapsed % 60).padStart(2, "0")})
            </span>
          )}
        </p>
      )}
    </>
  );
}

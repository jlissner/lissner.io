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
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginTop: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Search your media…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.9375rem" }}
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={searching}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#4f46e5",
            color: "#fff",
            fontWeight: 500,
            cursor: searching ? "not-allowed" : "pointer",
          }}
        >
          {searching ? "Searching…" : "Search"}
        </button>
        <button
          type="button"
          onClick={() => onIndex(false)}
          disabled={indexPolling}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: indexPolling ? "not-allowed" : "pointer" }}
        >
          Index for AI search
        </button>
        <button
          type="button"
          onClick={() => onIndex(true)}
          disabled={indexPolling}
          title="Re-index all files (including already indexed)"
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: indexPolling ? "not-allowed" : "pointer", fontSize: "0.8125rem" }}
        >
          Re-index all
        </button>
      </div>
      {indexStatus && (
        <p
          style={{
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: indexStatus.startsWith("Indexed") ? "#059669" : indexStatus.startsWith("Indexing") ? "#4f46e5" : "#dc2626",
          }}
        >
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

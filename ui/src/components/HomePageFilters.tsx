interface HomePageFiltersProps {
  title: string;
  onClearFilter?: () => void;
  sortBy: "uploaded" | "taken";
  setSortBy: (v: "uploaded" | "taken") => void;
  columnsPerRow: number;
  setColumnsPerRow: (v: number) => void;
}

export function HomePageFilters({
  title,
  onClearFilter,
  sortBy,
  setSortBy,
  columnsPerRow,
  setColumnsPerRow,
}: HomePageFiltersProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, flexShrink: 0, flexWrap: "wrap" }}>
      <h2 style={{ fontSize: "1.125rem", margin: 0 }}>{title}</h2>
      {onClearFilter && (
        <button
          type="button"
          onClick={onClearFilter}
          style={{ padding: "6px 12px", fontSize: "0.8125rem", cursor: "pointer", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b" }}
        >
          Clear filter
        </button>
      )}
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", color: "#64748b" }}>
        <span>Sort:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "uploaded" | "taken")}
          style={{ padding: "4px 8px", fontSize: "0.875rem", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff" }}
        >
          <option value="uploaded">Date uploaded</option>
          <option value="taken">Date taken</option>
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", color: "#64748b" }}>
        <span>Columns:</span>
        <input type="range" min={1} max={16} value={columnsPerRow} onChange={(e) => setColumnsPerRow(Number(e.target.value))} style={{ width: 80 }} />
        <span>{columnsPerRow}</span>
      </label>
    </div>
  );
}

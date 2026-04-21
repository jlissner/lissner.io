interface HomePageFiltersProps {
  title: string;
  sortBy: "uploaded" | "taken";
  setSortBy: (v: "uploaded" | "taken") => void;
  columnsPerRow: number;
  setColumnsPerRow: (v: number) => void;
}

export function HomePageFilters({
  title,
  sortBy,
  setSortBy,
  columnsPerRow,
  setColumnsPerRow,
}: HomePageFiltersProps) {
  return (
    <div className="filters">
      <h2 className="filters__title">{title}</h2>
      <div className="filters__controls">
        <label className="filters__label filters__label--sort">
          <span className="u-sr-only">Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "uploaded" | "taken")}
            className="filters__select"
          >
            <option value="uploaded">Uploaded</option>
            <option value="taken">Taken</option>
          </select>
        </label>
        <label className="filters__label filters__label--cols">
          <span>Cols:</span>
          <input
            type="range"
            min={2}
            max={12}
            value={columnsPerRow}
            onChange={(e) => setColumnsPerRow(Number(e.target.value))}
            className="filters__range"
          />
          <span>{columnsPerRow}</span>
        </label>
      </div>
    </div>
  );
}

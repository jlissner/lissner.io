import { Button } from "@/components/ui/button";

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
    <div className="filters">
      <h2 className="filters__title">{title}</h2>
      {onClearFilter && (
        <Button variant="secondary" size="sm" onClick={onClearFilter}>
          Clear filter
        </Button>
      )}
      <label className="filters__label">
        <span>Sort:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "uploaded" | "taken")}
          className="filters__select"
        >
          <option value="uploaded">Date uploaded</option>
          <option value="taken">Date taken</option>
        </select>
      </label>
      <label className="filters__label">
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
  );
}

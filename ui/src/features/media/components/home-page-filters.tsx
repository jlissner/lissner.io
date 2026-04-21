interface HomePageFiltersProps {
  title: string;
  columnsPerRow: number;
  setColumnsPerRow: (v: number) => void;
}

export function HomePageFilters({ title, columnsPerRow, setColumnsPerRow }: HomePageFiltersProps) {
  return (
    <div className="filters">
      <h2 className="filters__title">{title}</h2>
      <div className="filters__controls">
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

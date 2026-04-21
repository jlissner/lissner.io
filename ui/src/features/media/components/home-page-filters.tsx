import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiJson } from "@/api/client";
import type { PersonSummary } from "../../../../../shared/src/api.js";

interface HomePageFiltersProps {
  title: string;
  personFilter: number | null;
  onPersonFilterChange: (personId: number | null) => void;
  onClearFilter?: () => void;
  sortBy: "uploaded" | "taken";
  setSortBy: (v: "uploaded" | "taken") => void;
  columnsPerRow: number;
  setColumnsPerRow: (v: number) => void;
}

export function HomePageFilters({
  title,
  personFilter,
  onPersonFilterChange,
  onClearFilter,
  sortBy,
  setSortBy,
  columnsPerRow,
  setColumnsPerRow,
}: HomePageFiltersProps) {
  const [people, setPeople] = useState<PersonSummary[]>([]);

  useEffect(() => {
    apiJson<PersonSummary[]>("people")
      .then(setPeople)
      .catch(() => setPeople([]));
  }, []);

  const sortedPeople = useMemo(
    () =>
      [...people].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [people]
  );

  const hasPeople = sortedPeople.length > 0;

  return (
    <div className="filters">
      <h2 className="filters__title">{title}</h2>
      {onClearFilter && (
        <Button variant="secondary" size="sm" onClick={onClearFilter}>
          Clear filter
        </Button>
      )}
      <div className="filters__controls">
        {hasPeople && (
          <label className="filters__label">
            <span>Person:</span>
            <select
              value={personFilter ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onPersonFilterChange(v ? Number(v) : null);
              }}
              className="filters__select"
            >
              <option value="">All</option>
              {sortedPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.photoCount})
                </option>
              ))}
            </select>
          </label>
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

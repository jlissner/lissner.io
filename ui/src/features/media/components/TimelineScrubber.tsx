import { useEffect, useMemo, useState, useCallback } from "react";
import { apiJson } from "@/api/client";

interface TimelineScrubberProps {
  sortBy: "uploaded" | "taken";
  personFilter: number | null;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  onJumpToMonth: (offset: number) => void;
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatMonthKey(key: string): string {
  const [year, month] = key.split("-");
  const mi = Number(month) - 1;
  return `${SHORT_MONTHS[mi]} '${year.slice(2)}`;
}

function formatMonthKeyFull(key: string): string {
  const [year, month] = key.split("-");
  const mi = Number(month) - 1;
  return `${SHORT_MONTHS[mi]} ${year}`;
}

export function TimelineScrubber({
  sortBy,
  personFilter,
  scrollContainerRef,
  onJumpToMonth,
}: TimelineScrubberProps) {
  const [months, setMonths] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ sortBy });
    if (personFilter != null) params.set("personId", String(personFilter));
    apiJson<{ months: string[] }>(`media/timeline?${params}`)
      .then((data) => setMonths(data.months))
      .catch(() => setMonths([]));
  }, [sortBy, personFilter]);

  const yearGroups = useMemo(() => {
    const groups: Array<{ year: string; months: string[] }> = [];
    const acc = { year: "", items: [] as string[] };
    for (const key of months) {
      const y = key.split("-")[0];
      if (y !== acc.year) {
        if (acc.items.length > 0) groups.push({ year: acc.year, months: acc.items });
        acc.year = y;
        acc.items = [key];
      } else {
        acc.items.push(key);
      }
    }
    if (acc.items.length > 0) groups.push({ year: acc.year, months: acc.items });
    return groups;
  }, [months]);

  const handleJump = useCallback(
    (monthKey: string) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const sections = container.querySelectorAll<HTMLElement>("[data-date-key]");
      const [targetYear, targetMonth] = monthKey.split("-");
      const prefix = `${targetYear}-${targetMonth}`;

      for (const section of sections) {
        const key = section.dataset.dateKey ?? "";
        if (key.startsWith(prefix)) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }

      const params = new URLSearchParams({ sortBy, month: monthKey });
      if (personFilter != null) params.set("personId", String(personFilter));
      apiJson<{ offset: number }>(`media/timeline/offset?${params}`)
        .then(({ offset }) => onJumpToMonth(offset))
        .catch(() => {});
    },
    [scrollContainerRef, sortBy, personFilter, onJumpToMonth]
  );

  if (months.length === 0) return null;

  return (
    <div className="timeline-scrubber">
      <div className="timeline-scrubber__track">
        {yearGroups.map((group) => (
          <div key={group.year} className="timeline-scrubber__year">
            <div className="timeline-scrubber__year-label">{group.year}</div>
            {group.months.map((key) => (
              <button
                key={key}
                type="button"
                className="timeline-scrubber__marker"
                onClick={() => handleJump(key)}
                title={formatMonthKeyFull(key)}
              >
                {formatMonthKey(key)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

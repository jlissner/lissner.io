import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { apiJson } from "@/api";
import { useMatchMaxWidth } from "../hooks/use-match-max-width";

interface TimelineScrubberProps {
  sortBy: "uploaded" | "taken";
  setSortBy: (v: "uploaded" | "taken") => void;
  scrollContainerRef: RefObject<HTMLElement | null>;
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

const MOBILE_MAX_PX = 639;
const EDGE_SWIPE_PX = 36;
const SWIPE_OPEN_DX = -44;
const SWIPE_CLOSE_DX = 56;

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
  setSortBy,
  scrollContainerRef,
  onJumpToMonth,
}: TimelineScrubberProps) {
  const [months, setMonths] = useState<string[]>([]);
  const isNarrow = useMatchMaxWidth(MOBILE_MAX_PX);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerPanelRef = useRef<HTMLDivElement>(null);
  const edgeSwipeRef = useRef({
    fromEdge: false,
    startX: 0,
    startY: 0,
  });
  const panelSwipeRef = useRef({
    active: false,
    startX: 0,
  });

  useEffect(() => {
    const params = new URLSearchParams({ sortBy });
    apiJson<{ months: string[] }>(`media/timeline?${params}`)
      .then((data) => setMonths(data.months))
      .catch(() => setMonths([]));
  }, [sortBy]);

  useEffect(() => {
    if (!isNarrow) setDrawerOpen(false);
  }, [isNarrow]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (!isNarrow || drawerOpen || months.length === 0) return;
    const el = scrollContainerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent): void => {
      const t = e.touches[0];
      if (!t) return;
      const rect = el.getBoundingClientRect();
      edgeSwipeRef.current.fromEdge = t.clientX >= rect.right - EDGE_SWIPE_PX;
      edgeSwipeRef.current.startX = t.clientX;
      edgeSwipeRef.current.startY = t.clientY;
    };

    const onTouchEnd = (e: TouchEvent): void => {
      if (!edgeSwipeRef.current.fromEdge) return;
      const t = e.changedTouches[0];
      if (!t) return;
      edgeSwipeRef.current.fromEdge = false;
      const dx = t.clientX - edgeSwipeRef.current.startX;
      const dy = t.clientY - edgeSwipeRef.current.startY;
      if (dx <= SWIPE_OPEN_DX && Math.abs(dy) < 88) setDrawerOpen(true);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isNarrow, drawerOpen, months.length, scrollContainerRef]);

  useEffect(() => {
    if (!drawerOpen || !isNarrow) return;
    const panel = drawerPanelRef.current;
    if (!panel) return;

    const onTouchStart = (e: TouchEvent): void => {
      const t = e.touches[0];
      if (!t) return;
      const rect = panel.getBoundingClientRect();
      if (t.clientX <= rect.left + 48) {
        panelSwipeRef.current.active = true;
        panelSwipeRef.current.startX = t.clientX;
      } else {
        panelSwipeRef.current.active = false;
      }
    };

    const onTouchEnd = (e: TouchEvent): void => {
      if (!panelSwipeRef.current.active) return;
      panelSwipeRef.current.active = false;
      const t = e.changedTouches[0];
      if (!t) return;
      if (t.clientX - panelSwipeRef.current.startX >= SWIPE_CLOSE_DX)
        setDrawerOpen(false);
    };

    panel.addEventListener("touchstart", onTouchStart, { passive: true });
    panel.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      panel.removeEventListener("touchstart", onTouchStart);
      panel.removeEventListener("touchend", onTouchEnd);
    };
  }, [drawerOpen, isNarrow]);

  const yearGroups = useMemo(() => {
    const groups: Array<{ year: string; months: string[] }> = [];
    const acc = { year: "", items: [] as string[] };
    for (const key of months) {
      const y = key.split("-")[0];
      if (y !== acc.year) {
        if (acc.items.length > 0)
          groups.push({ year: acc.year, months: acc.items });
        acc.year = y;
        acc.items = [key];
      } else {
        acc.items.push(key);
      }
    }
    if (acc.items.length > 0)
      groups.push({ year: acc.year, months: acc.items });
    return groups;
  }, [months]);

  const closeDrawerIfNarrow = useCallback(() => {
    if (isNarrow) setDrawerOpen(false);
  }, [isNarrow]);

  const handleJump = useCallback(
    (monthKey: string) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const sections =
        container.querySelectorAll<HTMLElement>("[data-date-key]");
      const [targetYear, targetMonth] = monthKey.split("-");
      const prefix = `${targetYear}-${targetMonth}`;

      for (const section of sections) {
        const key = section.dataset.dateKey ?? "";
        if (key.startsWith(prefix)) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
          closeDrawerIfNarrow();
          return;
        }
      }

      const params = new URLSearchParams({ sortBy, month: monthKey });
      apiJson<{ offset: number }>(`media/timeline/offset?${params}`)
        .then(({ offset }) => {
          onJumpToMonth(offset);
          closeDrawerIfNarrow();
        })
        .catch(() => {});
    },
    [scrollContainerRef, sortBy, onJumpToMonth, closeDrawerIfNarrow],
  );

  if (months.length === 0) return null;

  const scrubberInner = (
    <>
      <div className="timeline-scrubber__sort">
        <div className="timeline-scrubber__sort-label">Sort by</div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "uploaded" | "taken")}
          className="timeline-scrubber__sort-select"
        >
          <option value="uploaded">Uploaded</option>
          <option value="taken">Taken</option>
        </select>
      </div>
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
    </>
  );

  if (!isNarrow) {
    return (
      <div className="home-content__timeline">
        <div className="timeline-scrubber">{scrubberInner}</div>
      </div>
    );
  }

  return (
    <div className="home-content__timeline">
      <button
        type="button"
        className={`home-timeline-drawer__peek${drawerOpen ? " home-timeline-drawer__peek--hidden" : ""}`}
        aria-expanded={drawerOpen}
        aria-controls="home-timeline-drawer-panel"
        onClick={() => setDrawerOpen(true)}
      >
        <span aria-hidden>⋮</span>
        <span className="u-sr-only">Open timeline</span>
      </button>
      <div
        className={`home-timeline-drawer__backdrop${drawerOpen ? " is-visible" : ""}`}
        onClick={() => setDrawerOpen(false)}
        role="presentation"
        aria-hidden
      />
      <div
        ref={drawerPanelRef}
        id="home-timeline-drawer-panel"
        className={`home-timeline-drawer__panel${drawerOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Timeline"
      >
        <div className="home-timeline-drawer__header">
          <span className="home-timeline-drawer__title">Timeline</span>
          <button
            type="button"
            className="btn btn--ghost home-timeline-drawer__done"
            onClick={() => setDrawerOpen(false)}
          >
            Done
          </button>
        </div>
        <div className="timeline-scrubber timeline-scrubber--drawer">
          {scrubberInner}
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";

interface HomePageToolbarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSearch: () => void;
  searching: boolean;
  onIndex: (force: boolean) => void;
  indexPolling: boolean;
  /** Search / index API failures only (progress lives in the activity overlay). */
  toolbarError: string | null;
}

export function HomePageToolbar({
  searchQuery,
  setSearchQuery,
  onSearch,
  searching,
  onIndex,
  indexPolling,
  toolbarError,
}: HomePageToolbarProps) {
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
        <Button onClick={onSearch} disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </Button>
        <Button variant="secondary" onClick={() => onIndex(false)} disabled={indexPolling}>
          Index for AI search
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onIndex(true)}
          disabled={indexPolling}
          title="Re-index all files (including already indexed)"
        >
          Re-index all
        </Button>
      </div>
      {toolbarError && <p className="toolbar__status toolbar__status--danger">{toolbarError}</p>}
    </>
  );
}

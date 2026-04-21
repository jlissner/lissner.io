import { Button } from "@/components/ui/button";

interface HomePageToolbarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSearch: () => void;
  searching: boolean;
  onIndex: (force: boolean) => void;
  indexPolling: boolean;
  toolbarError: string | null;
  hasUnindexed: boolean;
}

export function HomePageToolbar({
  searchQuery,
  setSearchQuery,
  onSearch,
  searching,
  onIndex,
  indexPolling,
  toolbarError,
  hasUnindexed,
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
          enterKeyHint="search"
        />
        <Button onClick={onSearch} disabled={searching} size="sm">
          {searching ? "Searching…" : "Search"}
        </Button>
        {(hasUnindexed || indexPolling) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onIndex(false)}
            disabled={indexPolling}
          >
            {indexPolling ? "Indexing…" : "Index new"}
          </Button>
        )}
      </div>
      {toolbarError && <p className="toolbar__status toolbar__status--danger">{toolbarError}</p>}
    </>
  );
}

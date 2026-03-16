import { createPortal } from "react-dom";
import { HomePageToolbar } from "./HomePageToolbar";
import { HomePageFilters } from "./HomePageFilters";
import { MediaListBulkActions } from "./media/MediaListBulkActions";

interface HomePageHeaderBarProps {
  container: HTMLElement | null;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSearch: () => void;
  searching: boolean;
  onIndex: (force: boolean) => void;
  indexPolling: boolean;
  indexStatus: string | null;
  indexProgress: { processed: number; total: number } | null;
  indexElapsed: number | null;
  title: string;
  onClearFilter?: () => void;
  sortBy: "uploaded" | "taken";
  setSortBy: (v: "uploaded" | "taken") => void;
  columnsPerRow: number;
  setColumnsPerRow: (v: number) => void;
  selectedCount: number;
  onBulkDownload: () => void;
  onBulkDelete?: () => void;
  onBulkIndex?: () => void;
  onCancelSelection: () => void;
  bulkDeleting: boolean;
  bulkIndexing: boolean;
}

export function HomePageHeaderBar({
  container,
  searchQuery,
  setSearchQuery,
  onSearch,
  searching,
  onIndex,
  indexPolling,
  indexStatus,
  indexProgress,
  indexElapsed,
  title,
  onClearFilter,
  sortBy,
  setSortBy,
  columnsPerRow,
  setColumnsPerRow,
  selectedCount,
  onBulkDownload,
  onBulkDelete,
  onBulkIndex,
  onCancelSelection,
  bulkDeleting,
  bulkIndexing,
}: HomePageHeaderBarProps) {
  if (!container) return null;

  const content = (
    <div className="header-bar">
      <div className="header-bar__main">
        {selectedCount > 0 ? (
          <MediaListBulkActions
            count={selectedCount}
            onDownload={onBulkDownload}
            onDelete={onBulkDelete}
            onIndex={onBulkIndex}
            onCancel={onCancelSelection}
            deleting={bulkDeleting}
            indexing={bulkIndexing}
          />
        ) : (
          <HomePageToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={onSearch}
            searching={searching}
            onIndex={onIndex}
            indexPolling={indexPolling}
            indexStatus={indexStatus}
            indexProgress={indexProgress}
            indexElapsed={indexElapsed}
          />
        )}
      </div>
      <HomePageFilters
        title={title}
        onClearFilter={onClearFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        columnsPerRow={columnsPerRow}
        setColumnsPerRow={setColumnsPerRow}
      />
    </div>
  );

  return createPortal(content, container);
}

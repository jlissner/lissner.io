import { HomePageToolbar } from "./home-page-toolbar";
import { HomePageFilters } from "./home-page-filters";
import { MediaListBulkActions } from "./media-viewer/media-list-bulk-actions";

interface HomePageHeaderBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSearch: () => void;
  searching: boolean;
  onIndex: (force: boolean) => void;
  indexPolling: boolean;
  toolbarError: string | null;
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
  searchQuery,
  setSearchQuery,
  onSearch,
  searching,
  onIndex,
  indexPolling,
  toolbarError,
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
  return (
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
            toolbarError={toolbarError}
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
}

import { HomePageToolbar } from "./home-page-toolbar";
import { MediaListBulkActions } from "./media-viewer/media-list-bulk-actions";

interface HomePageHeaderBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSearch: () => void;
  searching: boolean;
  onIndex: (force: boolean) => void;
  indexPolling: boolean;
  toolbarError: string | null;
  hasUnindexed: boolean;
  selectedCount: number;
  onBulkDownload: () => void;
  onBulkDelete?: () => void;
  onBulkIndex?: () => void;
  onBulkDateTaken?: () => void;
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
  hasUnindexed,
  selectedCount,
  onBulkDownload,
  onBulkDelete,
  onBulkIndex,
  onBulkDateTaken,
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
            onDateTaken={onBulkDateTaken}
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
            hasUnindexed={hasUnindexed}
          />
        )}
      </div>
    </div>
  );
}

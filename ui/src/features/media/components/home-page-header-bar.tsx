import { HomePageToolbar } from "./home-page-toolbar";
import { MediaListBulkActions } from "./media-viewer/media-list-bulk-actions";

interface HomePageHeaderBarProps {
  committedSearchQuery: string;
  onCommitSearch: (query: string) => void;
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
  onBulkAddTags?: () => void;
  onCancelSelection: () => void;
  bulkDeleting: boolean;
  bulkIndexing: boolean;
}

export function HomePageHeaderBar({
  committedSearchQuery,
  onCommitSearch,
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
  onBulkAddTags,
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
            onAddTags={onBulkAddTags}
            onCancel={onCancelSelection}
            deleting={bulkDeleting}
            indexing={bulkIndexing}
          />
        ) : (
          <HomePageToolbar
            committedSearchQuery={committedSearchQuery}
            onCommitSearch={onCommitSearch}
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

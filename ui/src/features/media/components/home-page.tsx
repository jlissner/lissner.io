import { useCallback, useState } from "react";
import { MediaList } from "./media-list";
import { HomePageHeaderBar } from "./home-page-header-bar";
import { TimelineScrubber } from "./TimelineScrubber";
import { BulkDateModal } from "./BulkDateModal";
import { useHomePage } from "../hooks/use-home-page";

interface HomePageProps {
  personFilter: number | null;
  personFilterName: string | null;
  onClearPersonFilter: () => void;
  onPersonFilterChange: (personId: number | null) => void;
}

export function HomePage({
  personFilter,
  personFilterName,
  onClearPersonFilter,
  onPersonFilterChange,
}: HomePageProps) {
  const [bulkDateOpen, setBulkDateOpen] = useState(false);

  const {
    displayItems,
    loading,
    loadingMore,
    loadingPrevious,
    hasPreviousPage,
    isSearchMode,
    items,
    total,
    sentinelRef,
    topSentinelRef,
    scrollContainerRef,
    searchQuery,
    setSearchQuery,
    handleSearch,
    searching,
    handleIndex,
    indexPolling,
    toolbarError,
    columnsPerRow,
    setColumnsPerRow,
    sortBy,
    setSortBy,
    selected,
    setSelected,
    selectionMode,
    clearSelection,
    handleCheckboxToggle,
    toggleSelectAllForDay,
    handleBulkDownload,
    handleBulkDeleteWrapped,
    handleBulkIndexWrapped,
    bulkAction,
    fetchItems,
    hasUnindexed,
    jumpToOffset,
  } = useHomePage({ personFilter });

  const title = isSearchMode
    ? "Search results"
    : personFilterName
      ? `Photos of ${personFilterName}`
      : "Your files";

  const handleBulkDateDone = useCallback(() => {
    setBulkDateOpen(false);
    clearSelection();
    fetchItems();
  }, [clearSelection, fetchItems]);

  return (
    <>
      <HomePageHeaderBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        searching={searching}
        onIndex={handleIndex}
        indexPolling={indexPolling}
        toolbarError={toolbarError}
        hasUnindexed={hasUnindexed}
        title={title}
        personFilter={personFilter}
        onPersonFilterChange={onPersonFilterChange}
        onClearFilter={personFilterName ? onClearPersonFilter : undefined}
        sortBy={sortBy}
        setSortBy={setSortBy}
        columnsPerRow={columnsPerRow}
        setColumnsPerRow={setColumnsPerRow}
        selectedCount={selected.size}
        onBulkDownload={handleBulkDownload}
        onBulkDelete={handleBulkDeleteWrapped}
        onBulkIndex={handleBulkIndexWrapped}
        onBulkDateTaken={() => setBulkDateOpen(true)}
        onCancelSelection={clearSelection}
        bulkDeleting={bulkAction === "deleting"}
        bulkIndexing={bulkAction === "indexing"}
      />
      <div className="home-content">
        <div ref={scrollContainerRef} className="home-content__scroll">
          {!isSearchMode && hasPreviousPage && (
            <div
              ref={topSentinelRef}
              className="u-flex-shrink-0"
              style={{ height: 20 }}
              aria-hidden
            />
          )}
          {loadingPrevious && !isSearchMode && <p className="empty">Loading earlier…</p>}
          <MediaList
            items={displayItems}
            loading={loading && !isSearchMode}
            columnsPerRow={columnsPerRow}
            sortBy={sortBy}
            selected={selected}
            setSelected={setSelected}
            selectionMode={selectionMode}
            onCheckboxToggle={handleCheckboxToggle}
            onToggleSelectAllForDay={toggleSelectAllForDay}
            onUpdate={undefined}
          />
          {!isSearchMode && items.length < total && total > 0 && (
            <div ref={sentinelRef} className="u-flex-shrink-0" style={{ height: 20 }} aria-hidden />
          )}
          {loadingMore && !isSearchMode && <p className="empty">Loading more…</p>}
        </div>
        <TimelineScrubber
          sortBy={sortBy}
          personFilter={personFilter}
          scrollContainerRef={scrollContainerRef}
          onJumpToMonth={jumpToOffset}
        />
      </div>
      {bulkDateOpen && selected.size > 0 && (
        <BulkDateModal
          mediaIds={Array.from(selected)}
          onClose={() => setBulkDateOpen(false)}
          onDone={handleBulkDateDone}
        />
      )}
    </>
  );
}

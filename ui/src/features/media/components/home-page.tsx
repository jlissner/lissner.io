import { useCallback, useState } from "react";
import { MediaList } from "./media-list";
import { HomePageHeaderBar } from "./home-page-header-bar";
import { TimelineScrubber } from "./TimelineScrubber";
import { BulkDateModal } from "./BulkDateModal";
import { useHomePage } from "../hooks/use-home-page";

export function HomePage() {
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
  } = useHomePage();

  const handleBulkDateDone = useCallback(() => {
    setBulkDateOpen(false);
    clearSelection();
    fetchItems();
  }, [clearSelection, fetchItems]);

  return (
    <div className="home-page">
      <HomePageHeaderBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        searching={searching}
        onIndex={handleIndex}
        indexPolling={indexPolling}
        toolbarError={toolbarError}
        hasUnindexed={hasUnindexed}
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
          {loadingPrevious && !isSearchMode && (
            <p className="empty">Loading earlier…</p>
          )}
          <MediaList
            items={displayItems}
            loading={loading && !isSearchMode}
            sortBy={sortBy}
            selected={selected}
            setSelected={setSelected}
            selectionMode={selectionMode}
            onCheckboxToggle={handleCheckboxToggle}
            onToggleSelectAllForDay={toggleSelectAllForDay}
            onUpdate={undefined}
          />
          {!isSearchMode && items.length < total && total > 0 && (
            <div
              ref={sentinelRef}
              className="u-flex-shrink-0"
              style={{ height: 20 }}
              aria-hidden
            />
          )}
          {loadingMore && !isSearchMode && (
            <p className="empty">Loading more…</p>
          )}
        </div>
        <TimelineScrubber
          sortBy={sortBy}
          setSortBy={setSortBy}
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
    </div>
  );
}

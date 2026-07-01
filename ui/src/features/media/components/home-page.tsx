import { useCallback, useState } from "react";
import { MediaList } from "./media-list";
import { HomePageHeaderBar } from "./home-page-header-bar";
import { TimelineScrubber } from "./TimelineScrubber";
import { BulkDateModal } from "./BulkDateModal";
import { BulkTagsModal } from "./BulkTagsModal";
import { useHomePage } from "../hooks/use-home-page";

export function HomePage() {
  const [bulkDateOpen, setBulkDateOpen] = useState(false);
  const [bulkTagsOpen, setBulkTagsOpen] = useState(false);

  const {
    displayItems,
    loading,
    loadingMore,
    loadingPrevious,
    hasPreviousPage,
    isSearchMode,
    items,
    total,
    searchTotal,
    sentinelRef,
    topSentinelRef,
    scrollContainerRef,
    searchQuery,
    setSearchQuery,
    activeSearchQuery,
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
    refetchSearch,
  } = useHomePage();

  const handleBulkDateDone = useCallback(() => {
    setBulkDateOpen(false);
    clearSelection();
    fetchItems();
    if (isSearchMode) refetchSearch();
  }, [clearSelection, fetchItems, isSearchMode, refetchSearch]);

  const handleBulkTagsClose = useCallback(() => {
    setBulkTagsOpen(false);
    clearSelection();
  }, [clearSelection]);

  const handleBulkTagsChanged = useCallback(() => {
    fetchItems();
    if (isSearchMode) refetchSearch();
  }, [fetchItems, isSearchMode, refetchSearch]);

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
        onBulkAddTags={() => setBulkTagsOpen(true)}
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
            loading={loading}
            sortBy={sortBy}
            selected={selected}
            setSelected={setSelected}
            selectionMode={selectionMode}
            onCheckboxToggle={handleCheckboxToggle}
            onToggleSelectAllForDay={toggleSelectAllForDay}
            onUpdate={() => {
              fetchItems();
              if (isSearchMode) refetchSearch();
            }}
          />
          {(isSearchMode
            ? displayItems.length < searchTotal
            : items.length < total) &&
            (isSearchMode ? searchTotal : total) > 0 && (
              <div
                ref={sentinelRef}
                className="u-flex-shrink-0"
                style={{ height: 20 }}
                aria-hidden
              />
            )}
          {loadingMore && <p className="empty">Loading more…</p>}
        </div>
        <TimelineScrubber
          sortBy={sortBy}
          setSortBy={setSortBy}
          scrollContainerRef={scrollContainerRef}
          onJumpToMonth={jumpToOffset}
          searchQuery={activeSearchQuery}
        />
      </div>
      {bulkDateOpen && selected.size > 0 && (
        <BulkDateModal
          mediaIds={Array.from(selected)}
          onClose={() => setBulkDateOpen(false)}
          onDone={handleBulkDateDone}
        />
      )}
      {bulkTagsOpen && selected.size > 0 && (
        <BulkTagsModal
          mediaIds={Array.from(selected)}
          onClose={handleBulkTagsClose}
          onChanged={handleBulkTagsChanged}
        />
      )}
    </div>
  );
}

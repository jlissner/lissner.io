import { useEffect, useState } from "react";
import { MediaList } from "./MediaList";
import { HomePageHeaderBar } from "./HomePageHeaderBar";
import { useHomePage } from "./useHomePage";

interface HomePageProps {
  personFilter: number | null;
  personFilterName: string | null;
  onClearPersonFilter: () => void;
}

export function HomePage({
  personFilter,
  personFilterName,
  onClearPersonFilter,
}: HomePageProps) {
  const {
    displayItems,
    loading,
    loadingMore,
    isSearchMode,
    items,
    total,
    sentinelRef,
    scrollContainerRef,
    searchQuery,
    setSearchQuery,
    handleSearch,
    searching,
    handleIndex,
    indexPolling,
    indexStatus,
    indexProgress,
    indexElapsed,
    columnsPerRow,
    setColumnsPerRow,
    sortBy,
    setSortBy,
    selected,
    setSelected,
    selectionMode,
    clearSelection,
    handleCheckboxClick,
    toggleSelectAllForDay,
    handleBulkDownload,
    handleBulkDeleteWrapped,
    handleBulkIndexWrapped,
    bulkAction,
  } = useHomePage({ personFilter });

  const [headerContainer, setHeaderContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderContainer(document.getElementById("home-header-actions"));
  }, []);

  const title = isSearchMode
    ? "Search results"
    : personFilterName
      ? `Photos of ${personFilterName}`
      : "Your files";

  return (
    <>
      <HomePageHeaderBar
        container={headerContainer}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        searching={searching}
        onIndex={handleIndex}
        indexPolling={indexPolling}
        indexStatus={indexStatus}
        indexProgress={indexProgress}
        indexElapsed={indexElapsed}
        title={title}
        onClearFilter={personFilterName ? onClearPersonFilter : undefined}
        sortBy={sortBy}
        setSortBy={setSortBy}
        columnsPerRow={columnsPerRow}
        setColumnsPerRow={setColumnsPerRow}
        selectedCount={selected.size}
        onBulkDownload={handleBulkDownload}
        onBulkDelete={handleBulkDeleteWrapped}
        onBulkIndex={handleBulkIndexWrapped}
        onCancelSelection={clearSelection}
        bulkDeleting={bulkAction === "deleting"}
        bulkIndexing={bulkAction === "indexing"}
      />
      <div ref={scrollContainerRef} className="u-flex-1 u-min-h-0 u-overflow-auto">
        <MediaList
          items={displayItems}
          loading={loading && !isSearchMode}
          columnsPerRow={columnsPerRow}
          sortBy={sortBy}
          selected={selected}
          setSelected={setSelected}
          selectionMode={selectionMode}
          onCheckboxClick={handleCheckboxClick}
          onToggleSelectAllForDay={toggleSelectAllForDay}
          onUpdate={undefined}
        />
        {!isSearchMode && items.length < total && total > 0 && (
          <div ref={sentinelRef} className="u-flex-shrink-0" style={{ height: 20 }} aria-hidden />
        )}
        {loadingMore && !isSearchMode && (
          <p className="empty">
            Loading more…
          </p>
        )}
      </div>
    </>
  );
}

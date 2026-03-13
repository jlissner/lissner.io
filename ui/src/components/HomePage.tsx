import { MediaList } from "./MediaList";
import { HomePageToolbar } from "./HomePageToolbar";
import { HomePageFilters } from "./HomePageFilters";
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
    handleDelete,
    handleBulkDelete,
    handleBulkIndex,
    fetchItems,
  } = useHomePage({ personFilter });

  const title = isSearchMode
    ? "Search results"
    : personFilterName
      ? `Photos of ${personFilterName}`
      : "Your files";

  return (
    <>
      <HomePageToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        searching={searching}
        onIndex={handleIndex}
        indexPolling={indexPolling}
        indexStatus={indexStatus}
        indexProgress={indexProgress}
        indexElapsed={indexElapsed}
      />
      <HomePageFilters
        title={title}
        onClearFilter={personFilterName ? onClearPersonFilter : undefined}
        sortBy={sortBy}
        setSortBy={setSortBy}
        columnsPerRow={columnsPerRow}
        setColumnsPerRow={setColumnsPerRow}
      />
      <div ref={scrollContainerRef} style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <MediaList
          items={displayItems}
          loading={loading && !isSearchMode}
          columnsPerRow={columnsPerRow}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkIndex={handleBulkIndex}
          onUpdate={fetchItems}
        />
        {!isSearchMode && items.length < total && total > 0 && (
          <div ref={sentinelRef} style={{ height: 20, flexShrink: 0 }} aria-hidden />
        )}
        {loadingMore && !isSearchMode && (
          <p style={{ textAlign: "center", padding: "1rem", fontSize: "0.875rem", color: "#64748b" }}>
            Loading more…
          </p>
        )}
      </div>
    </>
  );
}

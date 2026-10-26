import { useEffect, useRef } from "react";
import { useActivity } from "@/components/activity/activity-provider";
import { useGalleryUrlState } from "./use-gallery-url";
import { useMediaBulkActions } from "./use-media-bulk-actions";
import { useMediaListQuery } from "./use-media-list-query";
import { useMediaSearch } from "./use-media-search";
import { useMediaSelection } from "./use-media-selection";

export function useHomePage() {
  const activity = useActivity();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const galleryUrl = useGalleryUrlState();
  const mediaSearch = useMediaSearch({
    scrollContainerRef,
    activeQuery: galleryUrl.q,
  });
  const {
    isSearchMode,
    refetchSearch,
    items: searchItems,
    loading: searchLoading,
    loadingMore: searchLoadingMore,
    total: searchTotal,
    sentinelRef: searchSentinelRef,
    jumpToOffset: searchJumpToOffset,
    hasNextPage: searchHasNextPage,
    loadMore: searchLoadMore,
    activeQuery: activeSearchQuery,
    searching,
    toolbarError,
    setToolbarError,
  } = mediaSearch;
  const mediaList = useMediaListQuery({
    personFilter: galleryUrl.personId,
    sortBy: galleryUrl.sortBy,
    isSearchMode,
    scrollContainerRef,
  });
  const fetchItems = mediaList.fetchItems;
  const mediaSelection = useMediaSelection();
  const bulkActions = useMediaBulkActions({
    fetchItems: mediaList.fetchItems,
    displayItems: isSearchMode ? searchItems : mediaList.items,
    selected: mediaSelection.selected,
    clearSelection: mediaSelection.clearSelection,
    isSearchMode,
    refetchSearch,
    setToolbarError,
  });
  const prevActivityBusy = useRef(false);

  const indexPolling = activity?.index.inProgress ?? false;
  const displayItems = isSearchMode ? searchItems : mediaList.items;
  const hasUnindexed = displayItems.some((item) => !item.indexed);

  useEffect(() => {
    if (!activity) {
      prevActivityBusy.current = false;
      return;
    }
    const indexBusy = activity.index.inProgress;
    const syncBusy = activity.sync.inProgress;
    const busy = indexBusy || syncBusy;
    if (prevActivityBusy.current && !busy) {
      fetchItems();
      if (isSearchMode) refetchSearch();
    }
    prevActivityBusy.current = busy;
  }, [activity, fetchItems, isSearchMode, refetchSearch]);

  return {
    fetchItems,
    displayItems,
    hasUnindexed,
    loading: isSearchMode ? searchLoading : mediaList.loading,
    loadingMore: isSearchMode ? searchLoadingMore : mediaList.loadingMore,
    isSearchMode,
    searchTotal,
    items: mediaList.items,
    total: mediaList.total,
    sentinelRef: isSearchMode ? searchSentinelRef : mediaList.sentinelRef,
    scrollContainerRef,
    committedSearchQuery: galleryUrl.q ?? "",
    onCommitSearch: galleryUrl.setQ,
    activeSearchQuery,
    searching,
    handleIndex: bulkActions.handleIndex,
    indexPolling,
    toolbarError,
    sortBy: galleryUrl.sortBy,
    setSortBy: galleryUrl.setSortBy,
    personFilter: galleryUrl.personId,
    handleDelete: bulkActions.handleDelete,
    handleBulkDelete: bulkActions.handleBulkDelete,
    handleBulkIndex: bulkActions.handleBulkIndex,
    selected: mediaSelection.selected,
    setSelected: mediaSelection.setSelected,
    selectionMode: mediaSelection.selectionMode,
    clearSelection: mediaSelection.clearSelection,
    toggleSelect: mediaSelection.toggleSelect,
    handleCheckboxToggle: mediaSelection.handleCheckboxToggle,
    toggleSelectAllForDay: mediaSelection.toggleSelectAllForDay,
    handleBulkDownload: bulkActions.handleBulkDownload,
    handleBulkDeleteWrapped: bulkActions.handleBulkDeleteWrapped,
    handleBulkIndexWrapped: bulkActions.handleBulkIndexWrapped,
    bulkAction: bulkActions.bulkAction,
    jumpToOffset: isSearchMode ? searchJumpToOffset : mediaList.jumpToOffset,
    startOffset: mediaList.startOffset,
    topSentinelRef: mediaList.topSentinelRef,
    loadingPrevious: mediaList.loadingPrevious,
    hasPreviousPage: mediaList.hasPreviousPage,
    hasMoreItems: isSearchMode ? searchHasNextPage : mediaList.hasNextPage,
    loadMore: isSearchMode ? searchLoadMore : mediaList.loadMore,
    refetchSearch,
  };
}

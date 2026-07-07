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
  const mediaList = useMediaListQuery({
    personFilter: galleryUrl.personId,
    sortBy: galleryUrl.sortBy,
    isSearchMode: mediaSearch.isSearchMode,
    scrollContainerRef,
  });
  const fetchItems = mediaList.fetchItems;
  const mediaSelection = useMediaSelection();
  const bulkActions = useMediaBulkActions({
    fetchItems: mediaList.fetchItems,
    displayItems: mediaSearch.isSearchMode
      ? mediaSearch.items
      : mediaList.items,
    selected: mediaSelection.selected,
    clearSelection: mediaSelection.clearSelection,
    isSearchMode: mediaSearch.isSearchMode,
    refetchSearch: mediaSearch.refetchSearch,
    setToolbarError: mediaSearch.setToolbarError,
  });
  const prevActivityBusy = useRef(false);

  const indexPolling = activity?.index.inProgress ?? false;
  const displayItems = mediaSearch.isSearchMode
    ? mediaSearch.items
    : mediaList.items;
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
      if (mediaSearch.isSearchMode) mediaSearch.refetchSearch();
    }
    prevActivityBusy.current = busy;
  }, [
    activity,
    fetchItems,
    mediaSearch.isSearchMode,
    mediaSearch.refetchSearch,
  ]);

  return {
    fetchItems,
    displayItems,
    hasUnindexed,
    loading: mediaSearch.isSearchMode ? mediaSearch.loading : mediaList.loading,
    loadingMore: mediaSearch.isSearchMode
      ? mediaSearch.loadingMore
      : mediaList.loadingMore,
    isSearchMode: mediaSearch.isSearchMode,
    searchTotal: mediaSearch.total,
    items: mediaList.items,
    total: mediaList.total,
    sentinelRef: mediaSearch.isSearchMode
      ? mediaSearch.sentinelRef
      : mediaList.sentinelRef,
    scrollContainerRef,
    committedSearchQuery: galleryUrl.q ?? "",
    onCommitSearch: galleryUrl.setQ,
    activeSearchQuery: mediaSearch.activeQuery,
    searching: mediaSearch.searching,
    handleIndex: bulkActions.handleIndex,
    indexPolling,
    toolbarError: mediaSearch.toolbarError,
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
    jumpToOffset: mediaSearch.isSearchMode
      ? mediaSearch.jumpToOffset
      : mediaList.jumpToOffset,
    startOffset: mediaList.startOffset,
    topSentinelRef: mediaList.topSentinelRef,
    loadingPrevious: mediaList.loadingPrevious,
    hasPreviousPage: mediaList.hasPreviousPage,
    refetchSearch: mediaSearch.refetchSearch,
  };
}

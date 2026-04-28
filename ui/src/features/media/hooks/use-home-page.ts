import { useEffect, useRef } from "react";
import { useActivity } from "@/components/activity/activity-provider";
import { useMediaBulkActions } from "./use-media-bulk-actions";
import { useMediaListQuery } from "./use-media-list-query";
import { useMediaSearch } from "./use-media-search";
import { useMediaSelection } from "./use-media-selection";

interface UseHomePageOptions {
  personFilter?: number | null;
}

export function useHomePage({ personFilter }: UseHomePageOptions = {}) {
  const activity = useActivity();
  const mediaSearch = useMediaSearch();
  const mediaList = useMediaListQuery({
    personFilter: personFilter ?? null,
    isSearchMode: mediaSearch.searchResults !== null,
  });
  const fetchItems = mediaList.fetchItems;
  const mediaSelection = useMediaSelection();
  const bulkActions = useMediaBulkActions({
    fetchItems: mediaList.fetchItems,
    displayItems: mediaSearch.searchResults ?? mediaList.items,
    selected: mediaSelection.selected,
    clearSelection: mediaSelection.clearSelection,
    searchResults: mediaSearch.searchResults,
    setSearchResults: mediaSearch.setSearchResults,
    setToolbarError: mediaSearch.setToolbarError,
  });
  const prevActivityBusy = useRef(false);

  const indexPolling = activity?.index.inProgress ?? false;
  const displayItems = mediaSearch.searchResults ?? mediaList.items;
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
    }
    prevActivityBusy.current = busy;
  }, [activity, fetchItems]);

  return {
    fetchItems,
    displayItems,
    hasUnindexed,
    loading: mediaList.loading,
    loadingMore: mediaList.loadingMore,
    isSearchMode: mediaSearch.searchResults !== null,
    items: mediaList.items,
    total: mediaList.total,
    sentinelRef: mediaList.sentinelRef,
    scrollContainerRef: mediaList.scrollContainerRef,
    searchQuery: mediaSearch.searchQuery,
    setSearchQuery: mediaSearch.setSearchQuery,
    handleSearch: mediaSearch.handleSearch,
    searching: mediaSearch.searching,
    handleIndex: bulkActions.handleIndex,
    indexPolling,
    toolbarError: mediaSearch.toolbarError,
    sortBy: mediaList.sortBy,
    setSortBy: mediaList.setSortBy,
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
    jumpToOffset: mediaList.jumpToOffset,
    startOffset: mediaList.startOffset,
    topSentinelRef: mediaList.topSentinelRef,
    loadingPrevious: mediaList.loadingPrevious,
    hasPreviousPage: mediaList.hasPreviousPage,
  };
}

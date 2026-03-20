import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ApiError, apiFetch, apiJson } from "@/api/client";
import { useActivity } from "@/components/activity/activity-provider";
import type { MediaItem } from "@/features/media/components/media-viewer/media-utils";

interface UseHomePageOptions {
  personFilter: number | null;
}

interface MediaListResponse {
  items: MediaItem[];
  total: number;
}

export function useHomePage({ personFilter }: UseHomePageOptions) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [columnsPerRow, setColumnsPerRow] = useState(8);
  const [sortBy, setSortBy] = useState<"uploaded" | "taken">("uploaded");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"idle" | "deleting" | "indexing">("idle");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const PAGE_SIZE = 50;

  const activity = useActivity();

  const mediaQuery = useInfiniteQuery({
    queryKey: ["media", "list", { personFilter, sortBy }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageParam),
        sortBy,
      });
      if (personFilter != null) params.set("personId", String(personFilter));
      return apiJson<MediaListResponse>(`media?${params}`);
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const items = mediaQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const total = mediaQuery.data?.pages[0]?.total ?? 0;
  const loading = mediaQuery.isLoading;
  const loadingMore = mediaQuery.isFetchingNextPage;

  const fetchItems = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["media", "list"] });
  }, [queryClient]);

  const [toolbarError, setToolbarError] = useState<string | null>(null);
  const prevActivityBusy = useRef(false);

  const indexPolling = activity?.index.inProgress ?? false;

  useEffect(() => {
    if (!activity) {
      prevActivityBusy.current = false;
      return;
    }
    const indexBusy = activity.index.inProgress;
    const syncBusy = activity.sync.configured && activity.sync.inProgress;
    const busy = indexBusy || syncBusy;
    if (prevActivityBusy.current && !busy) {
      fetchItems();
    }
    prevActivityBusy.current = busy;
  }, [activity, fetchItems]);

  const loadMore = useCallback(async () => {
    if (
      loadingMoreRef.current ||
      !mediaQuery.hasNextPage ||
      mediaQuery.isFetchingNextPage ||
      items.length >= total
    ) {
      return;
    }
    loadingMoreRef.current = true;
    const container = scrollContainerRef.current;
    const scrollTop = container?.scrollTop ?? 0;
    try {
      await mediaQuery.fetchNextPage();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) container.scrollTop = scrollTop;
        });
      });
    } finally {
      loadingMoreRef.current = false;
    }
  }, [mediaQuery, items.length, total]);

  useEffect(() => {
    if (searchResults !== null || items.length >= total) return;
    const el = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!el || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root: container, rootMargin: "200px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [searchResults, items.length, total, loadMore]);

  useEffect(() => {
    window.addEventListener("home-refresh", fetchItems);
    return () => window.removeEventListener("home-refresh", fetchItems);
  }, [fetchItems]);

  const searchMutation = useMutation({
    mutationFn: async (q: string) =>
      apiJson<MediaItem[]>(`search?q=${encodeURIComponent(q)}`),
    onMutate: () => {
      setSearching(true);
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setToolbarError(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Search failed";
      setToolbarError(msg);
    },
    onSettled: () => {
      setSearching(false);
    },
  });

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      setToolbarError(null);
      return;
    }
    await searchMutation.mutateAsync(q);
  }, [searchQuery, searchMutation]);

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await apiFetch(`media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchItems();
      if (searchResults) setSearchResults((prev) => prev?.filter((i) => i.id !== id) ?? null);
    },
    [fetchItems, searchResults]
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      for (const id of ids) {
        const res = await apiFetch(`media/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
      }
      fetchItems();
      if (searchResults)
        setSearchResults((prev) => prev?.filter((i) => !ids.includes(i.id)) ?? null);
    },
    [fetchItems, searchResults]
  );

  const handleBulkIndex = useCallback(async (ids: string[]) => {
    setToolbarError(null);
    try {
      await apiJson("search/index?force=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: ids }),
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Index failed";
      setToolbarError(msg);
    }
  }, []);

  const handleIndex = useCallback(async (force = false) => {
    setToolbarError(null);
    try {
      const data = await apiJson<{ started?: boolean; error?: string }>(
        `search/index${force ? "?force=true" : ""}`,
        { method: "POST" }
      );
      if (data.started !== true) setToolbarError(data.error ?? "Indexing failed");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Indexing failed";
      setToolbarError(msg);
    }
  }, []);

  const displayItems = searchResults ?? items;
  const isSearchMode = searchResults !== null;
  const selectionMode = selected.size > 0;

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggleSelect = useCallback((id: string, e: MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCheckboxClick = useCallback(
    (id: string, e: MouseEvent) => {
      e.stopPropagation();
      toggleSelect(id, e);
    },
    [toggleSelect]
  );

  const toggleSelectAllForDay = useCallback((groupItems: MediaItem[]) => {
    const ids = new Set(groupItems.map((i) => i.id));
    setSelected((prev) => {
      const allSelected = ids.size > 0 && [...ids].every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const handleBulkDownload = useCallback(() => {
    const ids = Array.from(selected);
    ids.forEach((id) => {
      const item = displayItems.find((i) => i.id === id);
      if (item) {
        const a = document.createElement("a");
        a.href = `/api/media/${id}`;
        a.download = item.originalName;
        a.click();
      }
    });
  }, [selected, displayItems]);

  const handleBulkDeleteWrapped = useCallback(async () => {
    const ids = Array.from(selected);
    if (!ids.length || !confirm(`Delete ${ids.length} file(s)?`)) return;
    setBulkAction("deleting");
    try {
      await handleBulkDelete(ids);
      clearSelection();
    } finally {
      setBulkAction("idle");
    }
  }, [selected, handleBulkDelete, clearSelection]);

  const handleBulkIndexWrapped = useCallback(async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkAction("indexing");
    try {
      await handleBulkIndex(ids);
      clearSelection();
    } finally {
      setBulkAction("idle");
    }
  }, [selected, handleBulkIndex, clearSelection]);

  return {
    fetchItems,
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
    toolbarError,
    columnsPerRow,
    setColumnsPerRow,
    sortBy,
    setSortBy,
    handleDelete,
    handleBulkDelete,
    handleBulkIndex,
    selected,
    setSelected,
    selectionMode,
    clearSelection,
    toggleSelect,
    handleCheckboxClick,
    toggleSelectAllForDay,
    handleBulkDownload,
    handleBulkDeleteWrapped,
    handleBulkIndexWrapped,
    bulkAction,
  };
}

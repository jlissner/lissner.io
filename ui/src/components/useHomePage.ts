import { useCallback, useEffect, useRef, useState } from "react";
import { useActivity } from "../activity/ActivityProvider";
import type { MediaItem } from "./media/mediaUtils";

interface UseHomePageOptions {
  personFilter: number | null;
}

export function useHomePage({ personFilter }: UseHomePageOptions) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: "0", sortBy });
      if (personFilter != null) params.set("personId", String(personFilter));
      const res = await fetch(`/api/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [personFilter, sortBy]);

  const [indexStatus, setIndexStatus] = useState<string | null>(null);
  const prevIndexInProgress = useRef(false);
  /** True while either AI indexing or S3 sync is running — refetch when both are idle so indexed/backedUp flags refresh. */
  const prevActivityBusy = useRef(false);

  const indexPolling = activity?.index.inProgress ?? false;
  const indexElapsed = activity?.index.elapsedSeconds ?? null;
  const indexProgress =
    activity && activity.index.progressTotal > 0
      ? {
          processed: activity.index.progressProcessed,
          total: activity.index.progressTotal,
        }
      : null;

  useEffect(() => {
    const ip = activity?.index.inProgress ?? false;
    if (prevIndexInProgress.current && !ip && activity) {
      if (activity.index.lastError) {
        setIndexStatus(activity.index.lastError);
      } else if (activity.index.lastResult) {
        const r = activity.index.lastResult;
        setIndexStatus(
          `Indexed ${r.indexed} files${r.skipped > 0 ? `, ${r.skipped} already indexed` : ""}.`
        );
      }
    }
    prevIndexInProgress.current = ip;
  }, [activity]);

  useEffect(() => {
    if (!activity) {
      prevActivityBusy.current = false;
      return;
    }
    const indexBusy = activity.index.inProgress;
    const syncBusy = activity.sync.configured && activity.sync.inProgress;
    const busy = indexBusy || syncBusy;
    if (prevActivityBusy.current && !busy) {
      void fetchItems();
    }
    prevActivityBusy.current = busy;
  }, [activity, fetchItems]);

  const startPolling = useCallback(() => {
    setIndexStatus("Indexing…");
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || items.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const container = scrollContainerRef.current;
    const scrollTop = container?.scrollTop ?? 0;
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(items.length),
        sortBy,
      });
      if (personFilter != null) params.set("personId", String(personFilter));
      const res = await fetch(`/api/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        const newItems = data.items ?? [];
        setItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const toAdd = newItems.filter((i: MediaItem) => !existingIds.has(i.id));
          return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (container) container.scrollTop = scrollTop;
          });
        });
      }
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [items.length, total, personFilter, sortBy]);

  useEffect(() => {
    if (searchResults !== null || items.length >= total) return;
    const el = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!el || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: container, rootMargin: "200px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [searchResults, items.length, total, loadMore]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    window.addEventListener("home-refresh", fetchItems);
    return () => window.removeEventListener("home-refresh", fetchItems);
  }, [fetchItems]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setSearchResults(await res.json());
      else setIndexStatus((await res.json().catch(() => ({}))).error || "Search failed");
    } catch {
      setIndexStatus("Search failed");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, setIndexStatus]);

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchItems();
      if (searchResults) setSearchResults((prev) => prev?.filter((i) => i.id !== id) ?? null);
    },
    [fetchItems, searchResults]
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      for (const id of ids) {
        const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
      }
      await fetchItems();
      if (searchResults)
        setSearchResults((prev) => prev?.filter((i) => !ids.includes(i.id)) ?? null);
    },
    [fetchItems, searchResults]
  );

  const handleBulkIndex = useCallback(
    async (ids: string[]) => {
      const res = await fetch("/api/search/index?force=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: ids }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Index failed");
      startPolling();
    },
    [startPolling]
  );

  const handleIndex = useCallback(
    async (force = false) => {
      setIndexStatus(null);
      try {
        const res = await fetch(`/api/search/index${force ? "?force=true" : ""}`, {
          method: "POST",
        });
        const data = await res.json();
        if (res.ok && data.started) startPolling();
        else setIndexStatus(data.error || "Indexing failed");
      } catch {
        setIndexStatus("Indexing failed");
      }
    },
    [startPolling, setIndexStatus]
  );

  const displayItems = searchResults ?? items;
  const isSearchMode = searchResults !== null;
  const selectionMode = selected.size > 0;

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCheckboxClick = useCallback(
    (id: string, e: React.MouseEvent) => {
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

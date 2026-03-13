import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem } from "./media/mediaUtils";
import { useIndexPolling } from "./useIndexPolling";

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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 50;

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

  const { indexStatus, setIndexStatus, indexElapsed, indexProgress, indexPolling, startPolling } =
    useIndexPolling(fetchItems);

  const loadMore = useCallback(async () => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(items.length), sortBy });
      if (personFilter != null) params.set("personId", String(personFilter));
      const res = await fetch(`/api/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [...prev, ...(data.items ?? [])]);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [items.length, loadingMore, total, personFilter, sortBy]);

  useEffect(() => {
    if (searchResults !== null || items.length >= total) return;
    const el = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!el || !container) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
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

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    await fetchItems();
    if (searchResults) setSearchResults((prev) => prev?.filter((i) => i.id !== id) ?? null);
  }, [fetchItems, searchResults]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    }
    await fetchItems();
    if (searchResults) setSearchResults((prev) => prev?.filter((i) => !ids.includes(i.id)) ?? null);
  }, [fetchItems, searchResults]);

  const handleBulkIndex = useCallback(async (ids: string[]) => {
    const res = await fetch("/api/search/index?force=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaIds: ids }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Index failed");
    startPolling();
  }, [startPolling]);

  const handleIndex = useCallback(async (force = false) => {
    setIndexStatus(null);
    try {
      const res = await fetch(`/api/search/index${force ? "?force=true" : ""}`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.started) startPolling();
      else setIndexStatus(data.error || "Indexing failed");
    } catch {
      setIndexStatus("Indexing failed");
    }
  }, [startPolling, setIndexStatus]);

  const displayItems = searchResults ?? items;
  const isSearchMode = searchResults !== null;

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
  };
}

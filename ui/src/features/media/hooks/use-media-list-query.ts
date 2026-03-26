import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/api/client";
import type { MediaListQueryResponse } from "../../../../../shared/src/api.js";

interface UseMediaListQueryOptions {
  personFilter: number | null;
  isSearchMode: boolean;
}

const PAGE_SIZE = 50;

export function useMediaListQuery({ personFilter, isSearchMode }: UseMediaListQueryOptions) {
  const queryClient = useQueryClient();
  const [columnsPerRow, setColumnsPerRow] = useState(8);
  const [sortBy, setSortBy] = useState<"uploaded" | "taken">("uploaded");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

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
      return apiJson<MediaListQueryResponse>(`media?${params}`);
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
    if (isSearchMode || items.length >= total) return;
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
  }, [isSearchMode, items.length, total, loadMore]);

  useEffect(() => {
    window.addEventListener("home-refresh", fetchItems);
    return () => window.removeEventListener("home-refresh", fetchItems);
  }, [fetchItems]);

  return {
    fetchItems,
    items,
    total,
    loading,
    loadingMore,
    sentinelRef,
    scrollContainerRef,
    columnsPerRow,
    setColumnsPerRow,
    sortBy,
    setSortBy,
  };
}


import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/api/client";
import type { MediaListQueryResponse } from "../../../../../shared/src/api.js";

interface UseMediaListQueryOptions {
  personFilter: number | null;
  isSearchMode: boolean;
}

const PAGE_SIZE = 50;

type PageWithOffset = MediaListQueryResponse & { __offset: number };

export function useMediaListQuery({
  personFilter,
  isSearchMode,
}: UseMediaListQueryOptions) {
  const queryClient = useQueryClient();
  const [columnsPerRow, setColumnsPerRow] = useState(8);
  const [sortBy, setSortBy] = useState<"uploaded" | "taken">("uploaded");
  const [startOffset, setStartOffset] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const loadingPrevRef = useRef(false);

  const mediaQuery = useInfiniteQuery({
    queryKey: ["media", "list", { personFilter, sortBy, startOffset }],
    initialPageParam: startOffset,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageParam),
        sortBy,
      });
      if (personFilter != null) params.set("personId", String(personFilter));
      const data = await apiJson<MediaListQueryResponse>(`media?${params}`);
      return { ...data, __offset: pageParam } as PageWithOffset;
    },
    getNextPageParam: (_lastPage, allPages) => {
      const maxOffset = allPages.reduce(
        (max, p) =>
          Math.max(max, (p as PageWithOffset).__offset + p.items.length),
        0,
      );
      return maxOffset < (_lastPage.total ?? 0) ? maxOffset : undefined;
    },
    getPreviousPageParam: (_firstPage, allPages) => {
      const minOffset = allPages.reduce(
        (min, p) => Math.min(min, (p as PageWithOffset).__offset),
        Infinity,
      );
      return minOffset > 0 ? Math.max(0, minOffset - PAGE_SIZE) : undefined;
    },
    select: (data) => ({
      ...data,
      pages: [...data.pages].sort(
        (a, b) =>
          (a as PageWithOffset).__offset - (b as PageWithOffset).__offset,
      ),
    }),
  });

  const items = mediaQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const total = mediaQuery.data?.pages[0]?.total ?? 0;
  const loading = mediaQuery.isLoading;
  const loadingMore = mediaQuery.isFetchingNextPage;

  const fetchItems = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["media", "list"] });
  }, [queryClient]);

  const jumpToOffset = useCallback((offset: number) => {
    const aligned = Math.floor(offset / PAGE_SIZE) * PAGE_SIZE;
    setStartOffset(aligned);
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (container) container.scrollTop = 0;
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (
      loadingMoreRef.current ||
      !mediaQuery.hasNextPage ||
      mediaQuery.isFetchingNextPage
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
  }, [mediaQuery]);

  const loadPrevious = useCallback(async () => {
    if (
      loadingPrevRef.current ||
      !mediaQuery.hasPreviousPage ||
      mediaQuery.isFetchingPreviousPage
    ) {
      return;
    }
    loadingPrevRef.current = true;
    const container = scrollContainerRef.current;
    const scrollHeight = container?.scrollHeight ?? 0;
    try {
      await mediaQuery.fetchPreviousPage();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) {
            const newHeight = container.scrollHeight;
            container.scrollTop += newHeight - scrollHeight;
          }
        });
      });
    } finally {
      loadingPrevRef.current = false;
    }
  }, [mediaQuery]);

  useEffect(() => {
    if (isSearchMode) return;
    const el = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!el || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root: container, rootMargin: "200px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isSearchMode, loadMore]);

  useEffect(() => {
    if (isSearchMode || startOffset === 0) return;
    const el = topSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!el || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadPrevious();
      },
      { root: container, rootMargin: "200px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isSearchMode, startOffset, loadPrevious]);

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
    loadingPrevious: mediaQuery.isFetchingPreviousPage,
    hasPreviousPage: startOffset > 0 && (mediaQuery.hasPreviousPage ?? false),
    sentinelRef,
    topSentinelRef,
    scrollContainerRef,
    columnsPerRow,
    setColumnsPerRow,
    sortBy,
    setSortBy,
    jumpToOffset,
    startOffset,
  };
}

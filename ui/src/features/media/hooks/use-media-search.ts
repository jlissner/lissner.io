import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { apiJson, errorMessage } from "@/api";
import { SearchMediaResponse } from "@shared";

const PAGE_SIZE = 50;

type SearchPage = SearchMediaResponse & { __offset: number };

interface UseMediaSearchOptions {
  scrollContainerRef: RefObject<HTMLElement | null>;
  activeQuery: string | null;
}

export function useMediaSearch({
  scrollContainerRef,
  activeQuery,
}: UseMediaSearchOptions) {
  const queryClient = useQueryClient();
  const [toolbarError, setToolbarError] = useState<string | null>(null);
  const [startOffset, setStartOffset] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const searchQueryResult = useInfiniteQuery({
    queryKey: ["media", "search", { q: activeQuery, startOffset }],
    enabled: activeQuery != null,
    initialPageParam: startOffset,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        q: activeQuery!,
        limit: String(PAGE_SIZE),
        offset: String(pageParam),
      });
      const data = await apiJson<SearchMediaResponse>(`search?${params}`);
      return { ...data, __offset: pageParam } as SearchPage;
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    select: (data) => ({
      ...data,
      pages: [...data.pages].sort(
        (a, b) => (a as SearchPage).__offset - (b as SearchPage).__offset,
      ),
    }),
  });

  const items = searchQueryResult.data?.pages.flatMap((p) => p.items) ?? [];
  const total = searchQueryResult.data?.pages[0]?.total ?? 0;
  const searching =
    searchQueryResult.isFetching && !searchQueryResult.isFetchingNextPage;
  const loading = searchQueryResult.isLoading;
  const loadingMore = searchQueryResult.isFetchingNextPage;
  const isSearchMode = activeQuery != null;

  const refetchSearch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["media", "search"] });
  }, [queryClient]);

  useEffect(() => {
    setStartOffset(0);
  }, [activeQuery]);

  useEffect(() => {
    if (searchQueryResult.isError) {
      setToolbarError(errorMessage(searchQueryResult.error, "Search failed"));
    }
  }, [searchQueryResult.isError, searchQueryResult.error]);

  const jumpToOffset = useCallback(
    (offset: number) => {
      const aligned = Math.floor(offset / PAGE_SIZE) * PAGE_SIZE;
      setStartOffset(aligned);
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (container) container.scrollTop = 0;
      });
    },
    [scrollContainerRef],
  );

  const loadMore = useCallback(async () => {
    if (
      loadingMoreRef.current ||
      !searchQueryResult.hasNextPage ||
      searchQueryResult.isFetchingNextPage
    ) {
      return;
    }
    loadingMoreRef.current = true;
    const container = scrollContainerRef.current;
    const scrollTop = container?.scrollTop ?? 0;
    try {
      await searchQueryResult.fetchNextPage();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) container.scrollTop = scrollTop;
        });
      });
    } finally {
      loadingMoreRef.current = false;
    }
  }, [searchQueryResult, scrollContainerRef]);

  useEffect(() => {
    if (!isSearchMode) return;
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
  }, [isSearchMode, loadMore, scrollContainerRef]);

  return {
    activeQuery,
    items,
    total,
    isSearchMode,
    searching,
    loading,
    loadingMore,
    hasNextPage: searchQueryResult.hasNextPage ?? false,
    loadMore,
    toolbarError,
    setToolbarError,
    refetchSearch,
    jumpToOffset,
    sentinelRef,
    startOffset,
  };
}

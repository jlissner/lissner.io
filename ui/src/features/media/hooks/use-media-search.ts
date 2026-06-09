import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { apiJson, errorMessage } from "@/api";
import type { MediaItem } from "@/features/media/components/media-viewer/media-utils";
import type { SearchMediaResponse } from "@shared";

export function useMediaSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [toolbarError, setToolbarError] = useState<string | null>(null);

  const searchMutation = useMutation({
    mutationFn: async (q: string) =>
      apiJson<SearchMediaResponse>(`search?q=${encodeURIComponent(q)}`),
    onMutate: () => {
      setSearching(true);
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setToolbarError(null);
    },
    onError: (err: unknown) => {
      setToolbarError(errorMessage(err, "Search failed"));
    },
    onSettled: () => {
      setSearching(false);
    },
  });

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults(null);
      setToolbarError(null);
      return;
    }
    await searchMutation.mutateAsync(query);
  }, [searchQuery, searchMutation]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searching,
    toolbarError,
    setToolbarError,
    handleSearch,
  };
}

import { useCallback, useEffect, useState } from "react";
import type { MergeSuggestion } from "./people-types";
import { listMergeSuggestions, listPersonMediaPreviews } from "../api";
import type { MediaItem } from "@/features/media/components/media-viewer/media-utils";
import { PERSON_PREVIEW_PAGE_SIZE } from "./person-preview-paging";

export type PersonMediaItem = MediaItem & {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

interface UsePeoplePreviewOptions {
  selectedId: number | null;
  selectedName: string;
}

export function usePeoplePreview({
  selectedId,
  selectedName,
}: UsePeoplePreviewOptions) {
  const [previewMedia, setPreviewMedia] = useState<PersonMediaItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLoadingMore, setPreviewLoadingMore] = useState(false);
  const [previewExhausted, setPreviewExhausted] = useState(false);
  const [mergeSuggestions, setMergeSuggestions] = useState<MergeSuggestion[]>(
    [],
  );
  const [mergeSuggestionsLoading, setMergeSuggestionsLoading] = useState(false);

  useEffect(() => {
    if (!selectedId || !selectedName.trim().startsWith("Person")) {
      setMergeSuggestions([]);
      setMergeSuggestionsLoading(false);
      return;
    }
    const cancelled = { value: false };
    setMergeSuggestionsLoading(true);
    listMergeSuggestions(selectedId)
      .then((suggestions) => {
        if (cancelled.value) return;
        setMergeSuggestions(suggestions);
      })
      .catch((err) => {
        if (cancelled.value) return;
        console.error({ err, selectedId }, "Merge suggestions fetch failed");
        setMergeSuggestions([]);
      })
      .finally(() => {
        if (!cancelled.value) setMergeSuggestionsLoading(false);
      });
    return () => {
      cancelled.value = true;
    };
  }, [selectedId, selectedName]);

  useEffect(() => {
    if (!selectedId) {
      setPreviewMedia([]);
      setPreviewLoading(false);
      setPreviewExhausted(false);
      return;
    }
    const cancelled = { value: false };
    setPreviewLoading(true);
    setPreviewExhausted(false);
    listPersonMediaPreviews(selectedId, {
      limit: PERSON_PREVIEW_PAGE_SIZE,
      offset: 0,
    })
      .then((data) => {
        if (cancelled.value) return;
        setPreviewMedia(data as PersonMediaItem[]);
        setPreviewExhausted(data.length < PERSON_PREVIEW_PAGE_SIZE);
      })
      .catch((err) => {
        if (cancelled.value) return;
        console.error({ err, selectedId }, "Person media preview fetch failed");
        setPreviewMedia([]);
        setPreviewExhausted(true);
      })
      .finally(() => {
        if (!cancelled.value) setPreviewLoading(false);
      });
    return () => {
      cancelled.value = true;
    };
  }, [selectedId]);

  const loadMorePreview = useCallback(async () => {
    if (!selectedId || previewLoadingMore || previewExhausted) return;
    setPreviewLoadingMore(true);
    try {
      const next = await listPersonMediaPreviews(selectedId, {
        limit: PERSON_PREVIEW_PAGE_SIZE,
        offset: previewMedia.length,
      });
      setPreviewExhausted(next.length < PERSON_PREVIEW_PAGE_SIZE);
      setPreviewMedia((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const appended = (next as PersonMediaItem[]).filter(
          (m) => !seen.has(m.id),
        );
        return [...prev, ...appended];
      });
    } catch (err) {
      console.error(
        { err, selectedId },
        "Person media preview load more failed",
      );
    } finally {
      setPreviewLoadingMore(false);
    }
  }, [selectedId, previewMedia.length, previewLoadingMore, previewExhausted]);

  return {
    previewMedia,
    setPreviewMedia,
    previewLoading,
    previewLoadingMore,
    previewExhausted,
    loadMorePreview,
    mergeSuggestions,
    setMergeSuggestions,
    mergeSuggestionsLoading,
  };
}

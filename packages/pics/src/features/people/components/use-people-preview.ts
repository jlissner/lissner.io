import { useEffect, useState } from "react";
import type { MergeSuggestion } from "./people-types";
import { listMergeSuggestions, listPersonMediaPreviews } from "../api";
import type { MediaItem } from "@/features/media/components/media-viewer/media-utils";

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
      return;
    }
    setPreviewLoading(true);
    listPersonMediaPreviews(selectedId)
      .then((data) => setPreviewMedia(data as PersonMediaItem[]))
      .catch((err) => {
        console.error({ err, selectedId }, "Person media preview fetch failed");
        setPreviewMedia([]);
      })
      .finally(() => setPreviewLoading(false));
  }, [selectedId]);

  return {
    previewMedia,
    setPreviewMedia,
    previewLoading,
    mergeSuggestions,
    setMergeSuggestions,
    mergeSuggestionsLoading,
  };
}

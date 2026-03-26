import { useEffect, useState } from "react";
import type { MergeSuggestion } from "./people-types";
import { listMergeSuggestions, listPersonMediaPreviews } from "../api";

export interface MediaPreview {
  id: string;
  originalName?: string;
  mimeType: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  backedUp?: boolean;
}

interface UsePeoplePreviewOptions {
  selectedId: number | null;
  selectedName: string;
}

export function usePeoplePreview({ selectedId, selectedName }: UsePeoplePreviewOptions) {
  const [previewMedia, setPreviewMedia] = useState<MediaPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mergeSuggestions, setMergeSuggestions] = useState<MergeSuggestion[]>([]);
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
      .catch(() => {
        if (!cancelled.value) setMergeSuggestions([]);
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
      .then((data) => setPreviewMedia(data as MediaPreview[]))
      .catch(() => setPreviewMedia([]))
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


import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError } from "@/api/client";
import type { MediaItem } from "@/features/media/components/media-viewer/media-utils";
import { deleteMediaById, runBulkIndex, triggerIndex } from "../api";

interface UseMediaBulkActionsOptions {
  fetchItems: () => void;
  displayItems: MediaItem[];
  selected: Set<string>;
  clearSelection: () => void;
  searchResults: MediaItem[] | null;
  setSearchResults: Dispatch<SetStateAction<MediaItem[] | null>>;
  setToolbarError: Dispatch<SetStateAction<string | null>>;
}

export function useMediaBulkActions({
  fetchItems,
  displayItems,
  selected,
  clearSelection,
  searchResults,
  setSearchResults,
  setToolbarError,
}: UseMediaBulkActionsOptions) {
  const [bulkAction, setBulkAction] = useState<"idle" | "deleting" | "indexing">("idle");

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMediaById(id);
      fetchItems();
      if (searchResults) setSearchResults((prev) => prev?.filter((item) => item.id !== id) ?? null);
    },
    [fetchItems, searchResults, setSearchResults]
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      for (const id of ids) {
        await deleteMediaById(id);
      }
      fetchItems();
      if (searchResults) {
        setSearchResults((prev) => prev?.filter((item) => !ids.includes(item.id)) ?? null);
      }
    },
    [fetchItems, searchResults, setSearchResults]
  );

  const handleBulkIndex = useCallback(
    async (ids: string[]) => {
      setToolbarError(null);
      try {
        await runBulkIndex(ids);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Index failed";
        setToolbarError(msg);
      }
    },
    [setToolbarError]
  );

  const handleIndex = useCallback(
    async (force = false) => {
      setToolbarError(null);
      try {
        const data = await triggerIndex(force);
        if (data.started !== true) setToolbarError(data.error ?? "Indexing failed");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Indexing failed";
        setToolbarError(msg);
      }
    },
    [setToolbarError]
  );

  const handleBulkDownload = useCallback(() => {
    const ids = Array.from(selected);
    ids.forEach((id) => {
      const item = displayItems.find((entry) => entry.id === id);
      if (!item) return;
      const link = document.createElement("a");
      link.href = `/api/media/${id}`;
      link.download = item.originalName;
      link.click();
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
    handleDelete,
    handleBulkDelete,
    handleBulkIndex,
    handleIndex,
    handleBulkDownload,
    handleBulkDeleteWrapped,
    handleBulkIndexWrapped,
    bulkAction,
  };
}

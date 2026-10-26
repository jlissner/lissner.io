import { useCallback, useState } from "react";
import type { MediaItem } from "@/features/media/components/media-viewer/media-utils";

export function useMediaSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCheckboxToggle = useCallback(
    (id: string) => {
      toggleSelect(id);
    },
    [toggleSelect],
  );

  const toggleSelectAllForDay = useCallback((groupItems: MediaItem[]) => {
    const ids = new Set(groupItems.map((item) => item.id));
    setSelected((prev) => {
      const allSelected = ids.size > 0 && [...ids].every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  return {
    selected,
    setSelected,
    selectionMode,
    clearSelection,
    toggleSelect,
    handleCheckboxToggle,
    toggleSelectAllForDay,
  };
}

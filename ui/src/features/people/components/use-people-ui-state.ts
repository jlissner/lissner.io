import { useState } from "react";
import type { Person } from "./people-types";
import type { MediaPreview } from "./use-people-preview";

export function usePeopleUiState() {
  const [viewingMedia, setViewingMedia] = useState<MediaPreview | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<Person | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [mergeModal, setMergeModal] = useState<Person | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);

  return {
    viewingMedia,
    setViewingMedia,
    menuOpen,
    setMenuOpen,
    editModal,
    setEditModal,
    editDraft,
    setEditDraft,
    mergeModal,
    setMergeModal,
    mergeTargetId,
    setMergeTargetId,
    addModalOpen,
    setAddModalOpen,
  };
}


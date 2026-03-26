import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { MergeSuggestion, Person } from "./people-types";
import type { MediaPreview } from "./use-people-preview";

function faceTagLabel(count: number): string {
  return count === 1 ? "face tag" : "face tags";
}

function deletePersonMessage(person: Person): string {
  if (person.photoCount == null) {
    return `Delete "${person.name}"? All their face tags will be removed.`;
  }
  return `Delete "${person.name}"? This will remove ${person.photoCount} ${faceTagLabel(person.photoCount)}.`;
}

interface UsePeopleMutationsOptions {
  selectedId: number | null;
  fetchPeople: (options?: { silent?: boolean }) => Promise<void>;
  onUpdate?: () => void;
  setSelectedId: (id: number | null) => void;
  setPreviewMedia: Dispatch<SetStateAction<MediaPreview[]>>;
  setViewingMedia: Dispatch<SetStateAction<MediaPreview | null>>;
  setEditModal: Dispatch<SetStateAction<Person | null>>;
  setEditDraft: Dispatch<SetStateAction<string>>;
  setMergeModal: Dispatch<SetStateAction<Person | null>>;
  setMergeTargetId: Dispatch<SetStateAction<string>>;
  setAddModalOpen: Dispatch<SetStateAction<boolean>>;
  setMergeSuggestions: Dispatch<SetStateAction<MergeSuggestion[]>>;
  editModal: Person | null;
  editDraft: string;
}

export function usePeopleMutations({
  selectedId,
  fetchPeople,
  onUpdate,
  setSelectedId,
  setPreviewMedia,
  setViewingMedia,
  setEditModal,
  setEditDraft,
  setMergeModal,
  setMergeTargetId,
  setAddModalOpen,
  setMergeSuggestions,
  editModal,
  editDraft,
}: UsePeopleMutationsOptions) {
  const handleReassign = useCallback(
    async (mediaId: string, assignTo: number | "new") => {
      if (!selectedId) return;
      const isNewPerson = assignTo === "new";
      const url = isNewPerson
        ? `/api/media/${mediaId}/people/${selectedId}/reassign-new`
        : `/api/media/${mediaId}/people/${selectedId}`;
      const opts = isNewPerson
        ? { method: "POST" as const }
        : {
            method: "PUT" as const,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignTo }),
          };
      const res = await fetch(url, opts);
      if (res.ok) {
        const data = isNewPerson ? await res.json() : null;
        setPreviewMedia((prev) => prev.filter((m) => m.id !== mediaId));
        setViewingMedia(null);
        await fetchPeople();
        onUpdate?.();
        setSelectedId(isNewPerson ? data.newPersonId : assignTo);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Reassign failed");
      }
    },
    [selectedId, fetchPeople, onUpdate, setPreviewMedia, setViewingMedia, setSelectedId]
  );

  const handleRemoveFromPhoto = useCallback(
    async (mediaId: string) => {
      if (!selectedId) return;
      const res = await fetch(`/api/media/${mediaId}/people/${selectedId}`, { method: "DELETE" });
      if (res.ok) {
        setPreviewMedia((prev) => prev.filter((m) => m.id !== mediaId));
        setViewingMedia((prev) => {
          if (prev?.id === mediaId) return null;
          return prev;
        });
        await fetchPeople();
        onUpdate?.();
      }
    },
    [selectedId, fetchPeople, onUpdate, setPreviewMedia, setViewingMedia]
  );

  const handleMerge = useCallback(
    async (mergeFrom: number, mergeInto: number) => {
      const res = await fetch(`/api/people/${mergeFrom}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mergeInto }),
      });
      if (res.ok) {
        setMergeModal(null);
        setMergeTargetId("");
        setSelectedId(mergeInto);
        await fetchPeople();
        onUpdate?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Merge failed");
      }
    },
    [fetchPeople, onUpdate, setMergeModal, setMergeTargetId, setSelectedId]
  );

  const handleAddPerson = useCallback(
    async (name: string) => {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setAddModalOpen(false);
        await fetchPeople();
        onUpdate?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to add person");
      }
    },
    [fetchPeople, onUpdate, setAddModalOpen]
  );

  const handleDeletePerson = useCallback(
    async (person: Person) => {
      const msg = deletePersonMessage(person);
      if (!confirm(msg)) return;
      const res = await fetch(`/api/people/${person.id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedId === person.id) setSelectedId(null);
        setEditModal((m) => (m?.id === person.id ? null : m));
        setMergeModal((m) => (m?.id === person.id ? null : m));
        await fetchPeople();
        onUpdate?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete");
      }
    },
    [selectedId, fetchPeople, onUpdate, setSelectedId, setEditModal, setMergeModal]
  );

  const handleSaveName = useCallback(async () => {
    if (!editModal) return;
    const name = editDraft.trim();
    if (!name) return;
    const res = await fetch(`/api/people/${editModal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setEditModal(null);
      setEditDraft("");
      await fetchPeople();
      onUpdate?.();
    }
  }, [editModal, editDraft, fetchPeople, onUpdate, setEditModal, setEditDraft]);

  const handleMergeFromSuggestion = useCallback(
    async (mergeIntoId: number) => {
      if (!selectedId) return;
      await handleMerge(selectedId, mergeIntoId);
      setMergeSuggestions([]);
    },
    [selectedId, handleMerge, setMergeSuggestions]
  );

  return {
    handleReassign,
    handleRemoveFromPhoto,
    handleMerge,
    handleSaveName,
    handleAddPerson,
    handleDeletePerson,
    handleMergeFromSuggestion,
  };
}


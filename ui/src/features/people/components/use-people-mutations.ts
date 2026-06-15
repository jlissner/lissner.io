import { useCallback, type Dispatch, type SetStateAction } from "react";
import { errorMessage } from "@/api";
import { useToast } from "@/components/ui/toast";
import {
  createPerson,
  deletePerson,
  deletePersonViaDirectory,
  mergePeople,
  reassignTagToNewPerson,
  reassignTagToPerson,
  removeTagFromMedia,
  updatePerson,
} from "../api";
import type { MergeSuggestion, Person } from "./people-types";
import type { PersonMediaItem } from "./use-people-preview";

function faceTagLabel(count: number): string {
  return count === 1 ? "face tag" : "face tags";
}

function deletePersonMessage(person: Person): string | false {
  if (person.photoCount == null) {
    return `Delete "${person.name}"? All their face tags will be removed.`;
  }

  if (person.photoCount === 0) {
    return false;
  }

  return `Delete "${person.name}"? This will remove ${person.photoCount} ${faceTagLabel(person.photoCount)}.`;
}

interface UsePeopleMutationsOptions {
  selectedId: number | null;
  isAdmin: boolean;
  fetchPeople: (options?: { silent?: boolean }) => Promise<void>;
  onUpdate?: () => void;
  setSelectedId: (id: number | null) => void;
  setPreviewMedia: Dispatch<SetStateAction<PersonMediaItem[]>>;
  setViewingMedia: Dispatch<SetStateAction<PersonMediaItem | null>>;
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
  isAdmin,
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
  const { showToast } = useToast();

  const handleReassign = useCallback(
    async (mediaId: string, assignTo: number | "new") => {
      if (!selectedId) return;
      const isNewPerson = assignTo === "new";
      try {
        const nextSelectedId = isNewPerson
          ? (await reassignTagToNewPerson(mediaId, selectedId)).newPersonId
          : assignTo;
        if (!isNewPerson)
          await reassignTagToPerson(mediaId, selectedId, assignTo);
        setPreviewMedia((prev) => prev.filter((m) => m.id !== mediaId));
        setViewingMedia(null);
        await fetchPeople();
        onUpdate?.();
        setSelectedId(nextSelectedId);
      } catch (err) {
        showToast(errorMessage(err, "Reassign failed"));
      }
    },
    [
      selectedId,
      fetchPeople,
      onUpdate,
      setPreviewMedia,
      setViewingMedia,
      setSelectedId,
      showToast,
    ],
  );

  const handleRemoveFromPhoto = useCallback(
    async (mediaId: string) => {
      if (!selectedId) return;
      try {
        await removeTagFromMedia(mediaId, selectedId);
        setPreviewMedia((prev) => prev.filter((m) => m.id !== mediaId));
        setViewingMedia((prev) => {
          if (prev?.id === mediaId) return null;
          return prev;
        });
        await fetchPeople();
        onUpdate?.();
      } catch (err) {
        showToast(errorMessage(err, "Failed to remove tag"));
      }
    },
    [
      selectedId,
      fetchPeople,
      onUpdate,
      setPreviewMedia,
      setViewingMedia,
      showToast,
    ],
  );

  const handleMerge = useCallback(
    async (mergeFrom: number, mergeInto: number) => {
      try {
        await mergePeople(mergeFrom, mergeInto);
        setMergeModal(null);
        setMergeTargetId("");
        setSelectedId(mergeInto);
        await fetchPeople();
        onUpdate?.();
      } catch (err) {
        showToast(errorMessage(err, "Merge failed"));
      }
    },
    [
      fetchPeople,
      onUpdate,
      setMergeModal,
      setMergeTargetId,
      setSelectedId,
      showToast,
    ],
  );

  const handleAddPerson = useCallback(
    async (name: string) => {
      try {
        await createPerson(name);
        setAddModalOpen(false);
        await fetchPeople();
        onUpdate?.();
      } catch (err) {
        showToast(errorMessage(err, "Failed to add person"));
      }
    },
    [fetchPeople, onUpdate, setAddModalOpen, showToast],
  );

  const handleDeletePerson = useCallback(
    async (person: Person) => {
      const msg = deletePersonMessage(person);
      const confirmed = msg === false || confirm(msg);

      if (!confirmed) return;

      try {
        if (isAdmin) {
          await deletePersonViaDirectory(person.id);
        } else {
          await deletePerson(person.id);
        }
        if (selectedId === person.id) setSelectedId(null);
        setEditModal((m) => (m?.id === person.id ? null : m));
        setMergeModal((m) => (m?.id === person.id ? null : m));
        await fetchPeople();
        onUpdate?.();
      } catch (err) {
        showToast(errorMessage(err, "Failed to delete"));
      }
    },
    [
      isAdmin,
      selectedId,
      fetchPeople,
      onUpdate,
      setSelectedId,
      setEditModal,
      setMergeModal,
      showToast,
    ],
  );

  const handleSaveName = useCallback(async () => {
    if (!editModal) return;
    const name = editDraft.trim();
    if (!name) return;
    try {
      await updatePerson(editModal.id, name);
      setEditModal(null);
      setEditDraft("");
      await fetchPeople();
      onUpdate?.();
    } catch (err) {
      showToast(errorMessage(err, "Failed to rename"));
    }
  }, [
    editModal,
    editDraft,
    fetchPeople,
    onUpdate,
    setEditModal,
    setEditDraft,
    showToast,
  ]);

  const handleMergeFromSuggestion = useCallback(
    async (mergeIntoId: number) => {
      if (!selectedId) return;
      await handleMerge(selectedId, mergeIntoId);
      setMergeSuggestions([]);
    },
    [selectedId, handleMerge, setMergeSuggestions],
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

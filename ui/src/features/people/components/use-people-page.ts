import { useEffect } from "react";
import { usePeopleList } from "./use-people-list";
import { usePeopleMutations } from "./use-people-mutations";
import { usePeoplePreview } from "./use-people-preview";
import { usePeopleUiState } from "./use-people-ui-state";

export function usePeoplePage(onUpdate?: () => void) {
  const listState = usePeopleList();
  const uiState = usePeopleUiState();
  const previewState = usePeoplePreview({
    selectedId: listState.selectedId,
    selectedName: listState.selectedName,
  });
  const {
    setViewingMedia,
    setEditModal,
    setMergeModal,
    setAddModalOpen,
    setMenuOpen,
  } = uiState;
  const mutations = usePeopleMutations({
    selectedId: listState.selectedId,
    fetchPeople: listState.fetchPeople,
    onUpdate,
    setSelectedId: listState.setSelectedId,
    setPreviewMedia: previewState.setPreviewMedia,
    setViewingMedia: uiState.setViewingMedia,
    setEditModal: uiState.setEditModal,
    setEditDraft: uiState.setEditDraft,
    setMergeModal: uiState.setMergeModal,
    setMergeTargetId: uiState.setMergeTargetId,
    setAddModalOpen: uiState.setAddModalOpen,
    setMergeSuggestions: previewState.setMergeSuggestions,
    editModal: uiState.editModal,
    editDraft: uiState.editDraft,
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewingMedia(null);
        setEditModal(null);
        setMergeModal(null);
        setAddModalOpen(false);
        setMenuOpen(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    setViewingMedia,
    setEditModal,
    setMergeModal,
    setAddModalOpen,
    setMenuOpen,
  ]);

  return {
    people: listState.people,
    fetchPeople: listState.fetchPeople,
    loading: listState.loading,
    selectedId: listState.selectedId,
    setSelectedId: listState.setSelectedId,
    selectedName: listState.selectedName,
    previewMedia: previewState.previewMedia,
    previewLoading: previewState.previewLoading,
    viewingMedia: uiState.viewingMedia,
    setViewingMedia: uiState.setViewingMedia,
    menuOpen: uiState.menuOpen,
    setMenuOpen: uiState.setMenuOpen,
    editModal: uiState.editModal,
    setEditModal: uiState.setEditModal,
    editDraft: uiState.editDraft,
    setEditDraft: uiState.setEditDraft,
    mergeModal: uiState.mergeModal,
    setMergeModal: uiState.setMergeModal,
    mergeTargetId: uiState.mergeTargetId,
    setMergeTargetId: uiState.setMergeTargetId,
    mergeSuggestions: previewState.mergeSuggestions,
    mergeSuggestionsLoading: previewState.mergeSuggestionsLoading,
    handleMergeFromSuggestion: mutations.handleMergeFromSuggestion,
    handleReassign: mutations.handleReassign,
    handleRemoveFromPhoto: mutations.handleRemoveFromPhoto,
    handleMerge: mutations.handleMerge,
    handleSaveName: mutations.handleSaveName,
    handleAddPerson: mutations.handleAddPerson,
    handleDeletePerson: mutations.handleDeletePerson,
    addModalOpen: uiState.addModalOpen,
    setAddModalOpen: uiState.setAddModalOpen,
  };
}

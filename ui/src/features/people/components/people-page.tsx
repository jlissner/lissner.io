import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/api/client";
import { PeopleSidebar } from "./people-sidebar";
import { PeopleDetail } from "./people-detail";
import { PeopleEditModal } from "./people-edit-modal";
import { PeopleMergeModal } from "./people-merge-modal";
import { PeopleAddModal } from "./people-add-modal";
import { PeopleImageViewer } from "./people-image-viewer";
import { PeopleMatchFacesWizard } from "./people-match-faces-wizard";
import { isImage } from "@/features/media/components/media-viewer/media-utils";
import { usePeoplePage } from "./use-people-page";
import { runMatchFaces as runMatchFacesApi } from "../api";
import type { FaceMatchRunResponse } from "./people-types";

interface PeoplePageProps {
  onUpdate?: () => void;
  onViewAllPhotos?: (personId: number) => void;
}

export function PeoplePage({ onUpdate, onViewAllPhotos }: PeoplePageProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [matchFacesOpen, setMatchFacesOpen] = useState(false);
  const [matchFacesBusy, setMatchFacesBusy] = useState(false);
  const [matchFacesQueue, setMatchFacesQueue] = useState<FaceMatchRunResponse["reviewQueue"]>([]);
  const [matchFacesAutoMerged, setMatchFacesAutoMerged] =
    useState<FaceMatchRunResponse["autoMerged"]>([]);

  const {
    people,
    fetchPeople,
    loading,
    selectedId,
    setSelectedId,
    selectedName,
    mergeSuggestions,
    mergeSuggestionsLoading,
    handleMergeFromSuggestion,
    previewMedia,
    previewLoading,
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
    handleReassign,
    handleRemoveFromPhoto,
    handleMerge,
    handleSaveName,
    handleAddPerson,
    handleDeletePerson,
    addModalOpen,
    setAddModalOpen,
  } = usePeoplePage(onUpdate);

  const runMatchFaces = useCallback(async () => {
    setMatchFacesBusy(true);
    try {
      const data = (await runMatchFacesApi()) as FaceMatchRunResponse;
      setMatchFacesAutoMerged(data.autoMerged ?? []);
      setMatchFacesQueue(data.reviewQueue ?? []);
      setMatchFacesOpen(true);
      await fetchPeople({ silent: true });
      onUpdate?.();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Match faces failed";
      alert(message);
    } finally {
      setMatchFacesBusy(false);
    }
  }, [fetchPeople, onUpdate]);

  const selectedPerson = people.find((p) => p.id === selectedId);
  const hasPlaceholders = people.some((p) => p.name.trim().startsWith("Person"));
  const photoCount =
    selectedPerson?.photoCount ??
    previewMedia.filter((m) => isImage(m.mimeType, m.originalName)).length;

  if (loading) {
    return <div className="u-p-6 u-text-muted u-text-sm">Loading people…</div>;
  }

  return (
    <div className="u-flex u-flex-1 u-min-h-0 u-overflow-hidden">
      <PeopleSidebar
        people={people}
        selectedId={selectedId}
        menuOpen={menuOpen}
        onSelect={setSelectedId}
        onMenuToggle={setMenuOpen}
        onEdit={(p) => {
          setEditModal(p);
          setEditDraft(p.name.startsWith("Person ") ? "" : p.name);
        }}
        onMerge={setMergeModal}
        onDelete={handleDeletePerson}
        onAddPerson={() => setAddModalOpen(true)}
        onMatchFaces={hasPlaceholders ? runMatchFaces : undefined}
        matchFacesBusy={matchFacesBusy}
        menuRef={menuRef}
      />
      <PeopleDetail
        selectedId={selectedId}
        selectedName={selectedName || selectedPerson?.name || "Unknown"}
        photoCount={photoCount}
        previewMedia={previewMedia}
        previewLoading={previewLoading}
        mergeSuggestions={mergeSuggestions}
        mergeSuggestionsLoading={mergeSuggestionsLoading}
        onMergeIntoSuggestion={handleMergeFromSuggestion}
        onViewAllPhotos={onViewAllPhotos}
        onPhotoClick={setViewingMedia}
      />
      {addModalOpen && (
        <PeopleAddModal onAdd={handleAddPerson} onClose={() => setAddModalOpen(false)} />
      )}
      {editModal && (
        <PeopleEditModal
          person={editModal}
          draft={editDraft}
          onDraftChange={setEditDraft}
          onSave={handleSaveName}
          onClose={() => setEditModal(null)}
        />
      )}
      {mergeModal && (
        <PeopleMergeModal
          person={mergeModal}
          people={people}
          targetId={mergeTargetId}
          onTargetChange={setMergeTargetId}
          onMerge={() => {
            const target = parseInt(mergeTargetId, 10);
            if (!isNaN(target)) handleMerge(mergeModal.id, target);
          }}
          onClose={() => {
            setMergeModal(null);
            setMergeTargetId("");
          }}
        />
      )}
      {viewingMedia && selectedId && (
        <PeopleImageViewer
          media={viewingMedia}
          people={people}
          selectedId={selectedId}
          onClose={() => setViewingMedia(null)}
          onReassign={handleReassign}
          onRemove={handleRemoveFromPhoto}
        />
      )}
      {matchFacesOpen && (
        <PeopleMatchFacesWizard
          autoMerged={matchFacesAutoMerged}
          initialQueue={matchFacesQueue}
          namedPeople={people}
          onClose={() => setMatchFacesOpen(false)}
          onMerged={() => {
            void fetchPeople({ silent: true });
            onUpdate?.();
          }}
        />
      )}
    </div>
  );
}

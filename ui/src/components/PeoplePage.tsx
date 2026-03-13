import { useRef } from "react";
import { PeopleSidebar } from "./people/PeopleSidebar";
import { PeopleDetail } from "./people/PeopleDetail";
import { PeopleEditModal } from "./people/PeopleEditModal";
import { PeopleMergeModal } from "./people/PeopleMergeModal";
import { PeopleImageViewer } from "./people/PeopleImageViewer";
import { usePeoplePage } from "./people/usePeoplePage";

interface PeoplePageProps {
  onUpdate?: () => void;
  onViewAllPhotos?: (personId: number) => void;
}

export function PeoplePage({ onUpdate, onViewAllPhotos }: PeoplePageProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    people,
    loading,
    selectedId,
    setSelectedId,
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
  } = usePeoplePage(onUpdate);

  const selectedPerson = people.find((p) => p.id === selectedId);
  const photoCount = selectedPerson?.photoCount ?? previewMedia.filter((m) => m.mimeType.startsWith("image/")).length;

  if (loading) {
    return (
      <div style={{ padding: 24, color: "#64748b", fontSize: "0.875rem" }}>
        Loading people…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 0, minHeight: 0, flex: 1, overflow: "hidden" }}>
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
        menuRef={menuRef}
      />
      <PeopleDetail
        selectedId={selectedId}
        selectedName={selectedPerson?.name ?? "Unknown"}
        photoCount={photoCount}
        previewMedia={previewMedia}
        previewLoading={previewLoading}
        onViewAllPhotos={onViewAllPhotos}
        onPhotoClick={setViewingMedia}
      />
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
    </div>
  );
}

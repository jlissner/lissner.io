import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/api/client";
import {
  addPersonToMedia,
  listMediaFaces,
  listPeopleForTagging,
  reassignPersonInMedia,
  reassignPersonToNewInMedia,
  removePersonFromMedia,
} from "../../api";
import type { FaceBox, TaggedFace } from "./media-viewer-types";

interface UseMediaViewerFacesOptions {
  mediaId: string | undefined;
  taggingMode: boolean;
  onUpdate?: () => void;
  onTagChange?: () => void;
}

function getAssignFaceBody(
  personId: number | "new",
  assigningFace: FaceBox
): {
  createNew?: true;
  personId?: number;
  box: FaceBox;
} {
  if (personId === "new") {
    return { createNew: true, box: assigningFace };
  }
  return { personId, box: assigningFace };
}

export function useMediaViewerFaces({
  mediaId,
  taggingMode,
  onUpdate,
  onTagChange,
}: UseMediaViewerFacesOptions) {
  const [faces, setFaces] = useState<{ detected: FaceBox[]; tagged: TaggedFace[] } | null>(null);
  const [facesLoading, setFacesLoading] = useState(false);
  const [assigningFace, setAssigningFace] = useState<FaceBox | null>(null);
  const [reassigningFace, setReassigningFace] = useState<TaggedFace | null>(null);
  const [people, setPeople] = useState<Array<{ id: number; name: string }>>([]);

  const loadFaces = useCallback(async () => {
    if (!mediaId) return;
    setFacesLoading(true);
    try {
      const [facesData, peopleData] = await Promise.all([
        listMediaFaces(mediaId),
        listPeopleForTagging(),
      ]);
      setFaces({ detected: facesData.detected ?? [], tagged: facesData.tagged ?? [] });
      setPeople(peopleData);
    } catch {
      setFaces({ detected: [], tagged: [] });
    } finally {
      setFacesLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    if (taggingMode && mediaId) loadFaces();
    else setFaces(null);
  }, [taggingMode, mediaId, loadFaces]);

  const handleAssignFace = useCallback(
    async (personId: number | "new") => {
      if (!mediaId || !assigningFace) return;
      try {
        await addPersonToMedia(mediaId, getAssignFaceBody(personId, assigningFace));
        setAssigningFace(null);
        loadFaces();
        onUpdate?.();
        onTagChange?.();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to add tag";
        alert(message);
      }
    },
    [mediaId, assigningFace, loadFaces, onUpdate, onTagChange]
  );

  const handleReassignFace = useCallback(
    async (action: number | "new" | "remove") => {
      if (!mediaId || !reassigningFace) return;
      if (action === "remove") {
        try {
          await removePersonFromMedia(mediaId, reassigningFace.personId);
          setReassigningFace(null);
          loadFaces();
          onUpdate?.();
          onTagChange?.();
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Failed to remove tag";
          alert(message);
        }
        return;
      }
      if (action === "new") {
        try {
          await reassignPersonToNewInMedia(mediaId, reassigningFace.personId);
          setReassigningFace(null);
          loadFaces();
          onUpdate?.();
          onTagChange?.();
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Failed to reassign";
          alert(message);
        }
        return;
      }
      try {
        await reassignPersonInMedia(mediaId, reassigningFace.personId, action);
        setReassigningFace(null);
        loadFaces();
        onUpdate?.();
        onTagChange?.();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to reassign";
        alert(message);
      }
    },
    [mediaId, reassigningFace, loadFaces, onUpdate, onTagChange]
  );

  return {
    faces,
    facesLoading,
    assigningFace,
    setAssigningFace,
    reassigningFace,
    setReassigningFace,
    people,
    loadFaces,
    handleAssignFace,
    handleReassignFace,
  };
}

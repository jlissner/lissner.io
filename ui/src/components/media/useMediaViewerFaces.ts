import { useCallback, useEffect, useState } from "react";
import type { FaceBox, TaggedFace } from "./mediaViewerTypes";

interface UseMediaViewerFacesOptions {
  mediaId: string | undefined;
  taggingMode: boolean;
  onUpdate?: () => void;
}

export function useMediaViewerFaces({
  mediaId,
  taggingMode,
  onUpdate,
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
      const [facesRes, peopleRes] = await Promise.all([
        fetch(`/api/media/${mediaId}/faces`),
        fetch("/api/people"),
      ]);
      if (facesRes.ok) {
        const data = await facesRes.json();
        setFaces({ detected: data.detected ?? [], tagged: data.tagged ?? [] });
      } else {
        setFaces({ detected: [], tagged: [] });
      }
      if (peopleRes.ok) {
        const p = await peopleRes.json();
        setPeople(p);
      }
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
      const res = await fetch(`/api/media/${mediaId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          personId === "new"
            ? { createNew: true, box: assigningFace }
            : { personId, box: assigningFace }
        ),
      });
      if (res.ok) {
        setAssigningFace(null);
        loadFaces();
        onUpdate?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to add tag");
      }
    },
    [mediaId, assigningFace, loadFaces, onUpdate]
  );

  const handleReassignFace = useCallback(
    async (action: number | "new" | "remove") => {
      if (!mediaId || !reassigningFace) return;
      if (action === "remove") {
        const res = await fetch(`/api/media/${mediaId}/people/${reassigningFace.personId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setReassigningFace(null);
          loadFaces();
          onUpdate?.();
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || "Failed to remove tag");
        }
        return;
      }
      if (action === "new") {
        const res = await fetch(
          `/api/media/${mediaId}/people/${reassigningFace.personId}/reassign-new`,
          { method: "POST" }
        );
        if (res.ok) {
          setReassigningFace(null);
          loadFaces();
          onUpdate?.();
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || "Failed to reassign");
        }
        return;
      }
      const res = await fetch(`/api/media/${mediaId}/people/${reassigningFace.personId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignTo: action }),
      });
      if (res.ok) {
        setReassigningFace(null);
        loadFaces();
        onUpdate?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to reassign");
      }
    },
    [mediaId, reassigningFace, loadFaces, onUpdate]
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

import { useCallback, useEffect, useState } from "react";
import type { MergeSuggestion, Person } from "./people-types";

interface MediaPreview {
  id: string;
  originalName?: string;
  mimeType: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  backedUp?: boolean;
}

function faceTagLabel(count: number): string {
  return count === 1 ? "face tag" : "face tags";
}

function deletePersonMessage(person: Person): string {
  if (person.photoCount == null) {
    return `Delete "${person.name}"? All their face tags will be removed.`;
  }
  return `Delete "${person.name}"? This will remove ${person.photoCount} ${faceTagLabel(person.photoCount)}.`;
}

function clearModalIfMatchesId<T extends { id: number }>(current: T | null, id: number): T | null {
  if (current?.id === id) return null;
  return current;
}

function clearViewerIfMatchesMediaId(
  current: MediaPreview | null,
  mediaId: string
): MediaPreview | null {
  if (current?.id === mediaId) return null;
  return current;
}

export function usePeoplePage(onUpdate?: () => void) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewMedia, setPreviewMedia] = useState<MediaPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<MediaPreview | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [editModal, setEditModal] = useState<Person | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [mergeModal, setMergeModal] = useState<Person | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [mergeSuggestions, setMergeSuggestions] = useState<MergeSuggestion[]>([]);
  const [mergeSuggestionsLoading, setMergeSuggestionsLoading] = useState(false);

  const fetchPeople = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/people");
      if (res.ok) setPeople(await res.json());
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const selectedPerson = people.find((p) => p.id === selectedId);
  const selectedName = selectedPerson?.name ?? "";

  useEffect(() => {
    if (!selectedId || !selectedName.trim().startsWith("Person")) {
      setMergeSuggestions([]);
      setMergeSuggestionsLoading(false);
      return;
    }
    const cancelled = { v: false };
    setMergeSuggestionsLoading(true);
    fetch(`/api/people/${selectedId}/merge-suggestions`)
      .then((r) => r.json())
      .then((d: { suggestions?: MergeSuggestion[] }) => {
        if (!cancelled.v) {
          setMergeSuggestions(Array.isArray(d.suggestions) ? d.suggestions : []);
        }
      })
      .catch(() => {
        if (!cancelled.v) setMergeSuggestions([]);
      })
      .finally(() => {
        if (!cancelled.v) setMergeSuggestionsLoading(false);
      });
    return () => {
      cancelled.v = true;
    };
  }, [selectedId, selectedName]);

  useEffect(() => {
    if (!selectedId) {
      setPreviewMedia([]);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    fetch(`/api/people/${selectedId}/media?limit=100`)
      .then((r) => r.json())
      .then((data) => setPreviewMedia(Array.isArray(data) ? data : []))
      .catch(() => setPreviewMedia([]))
      .finally(() => setPreviewLoading(false));
  }, [selectedId]);

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
        fetchPeople();
        onUpdate?.();
        setSelectedId(isNewPerson ? data.newPersonId : assignTo);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Reassign failed");
      }
    },
    [selectedId, fetchPeople, onUpdate]
  );

  const handleRemoveFromPhoto = useCallback(
    async (mediaId: string) => {
      if (!selectedId) return;
      const res = await fetch(`/api/media/${mediaId}/people/${selectedId}`, { method: "DELETE" });
      if (res.ok) {
        setPreviewMedia((prev) => prev.filter((m) => m.id !== mediaId));
        setViewingMedia((prev) => clearViewerIfMatchesMediaId(prev, mediaId));
        fetchPeople();
        onUpdate?.();
      }
    },
    [selectedId, fetchPeople, onUpdate]
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
        fetchPeople();
        onUpdate?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Merge failed");
      }
    },
    [fetchPeople, onUpdate]
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
        fetchPeople();
        onUpdate?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to add person");
      }
    },
    [fetchPeople, onUpdate]
  );

  const handleDeletePerson = useCallback(
    async (p: Person) => {
      const msg = deletePersonMessage(p);
      if (!confirm(msg)) return;
      const res = await fetch(`/api/people/${p.id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedId === p.id) setSelectedId(null);
        setEditModal((m) => clearModalIfMatchesId(m, p.id));
        setMergeModal((m) => clearModalIfMatchesId(m, p.id));
        fetchPeople();
        onUpdate?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete");
      }
    },
    [selectedId, fetchPeople, onUpdate]
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
      fetchPeople();
      onUpdate?.();
    }
  }, [editModal, editDraft, fetchPeople, onUpdate]);

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
  }, []);

  const handleMergeFromSuggestion = useCallback(
    async (mergeIntoId: number) => {
      if (!selectedId) return;
      await handleMerge(selectedId, mergeIntoId);
      setMergeSuggestions([]);
    },
    [selectedId, handleMerge]
  );

  return {
    people,
    fetchPeople,
    loading,
    selectedId,
    setSelectedId,
    selectedName,
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
    mergeSuggestions,
    mergeSuggestionsLoading,
    handleMergeFromSuggestion,
    handleReassign,
    handleRemoveFromPhoto,
    handleMerge,
    handleSaveName,
    handleAddPerson,
    handleDeletePerson,
    addModalOpen,
    setAddModalOpen,
  };
}

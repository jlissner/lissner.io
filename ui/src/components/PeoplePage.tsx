import { useCallback, useEffect, useState } from "react";

interface Person {
  id: number;
  name: string;
}

interface MediaPreview {
  id: string;
  mimeType: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface PeoplePageProps {
  onUpdate?: () => void;
  onViewAllPhotos?: (personId: number) => void;
}

export function PeoplePage({ onUpdate, onViewAllPhotos }: PeoplePageProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewMedia, setPreviewMedia] = useState<MediaPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mergeFromId, setMergeFromId] = useState<number | null>(null);
  const [viewingMedia, setViewingMedia] = useState<MediaPreview | null>(null);
  const [reassigning, setReassigning] = useState(false);

  const fetchPeople = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/people");
      if (res.ok) {
        const data = await res.json();
        setPeople(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

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
      if (assignTo === "new") {
        const res = await fetch(`/api/media/${mediaId}/people/${selectedId}/reassign-new`, {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          setPreviewMedia((prev) => prev.filter((m) => m.id !== mediaId));
          setViewingMedia(null);
          setReassigning(false);
          fetchPeople();
          onUpdate?.();
          setSelectedId(data.newPersonId);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || "Reassign failed");
        }
      } else {
        const res = await fetch(`/api/media/${mediaId}/people/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignTo }),
        });
        if (res.ok) {
          setPreviewMedia((prev) => prev.filter((m) => m.id !== mediaId));
          setViewingMedia(null);
          setReassigning(false);
          fetchPeople();
          onUpdate?.();
          setSelectedId(assignTo);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || "Reassign failed");
        }
      }
    },
    [selectedId, fetchPeople, onUpdate]
  );

  const handleRemoveFromPhoto = useCallback(
    async (mediaId: string) => {
      if (!selectedId) return;
      const res = await fetch(`/api/media/${mediaId}/people/${selectedId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPreviewMedia((prev) => prev.filter((m) => m.id !== mediaId));
        setViewingMedia((prev) => (prev?.id === mediaId ? null : prev));
        fetchPeople();
        onUpdate?.();
      }
    },
    [selectedId, fetchPeople, onUpdate]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewingMedia(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleMerge = useCallback(
    async (mergeFrom: number, mergeInto: number) => {
      const res = await fetch(`/api/people/${mergeFrom}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mergeInto }),
      });
      if (res.ok) {
        setMergeFromId(null);
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

  const handleSave = useCallback(
    async (id: number) => {
      const name = draft.trim();
      if (!name) {
        setEditing(null);
        return;
      }
      const res = await fetch(`/api/people/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setEditing(null);
        fetchPeople();
        onUpdate?.();
      }
    },
    [draft, fetchPeople, onUpdate]
  );

  if (loading) {
    return (
      <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading people…</p>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.125rem", margin: "0 0 1rem" }}>
        People detected in your photos
      </h2>
      <p
        style={{
          margin: "0 0 1.5rem",
          fontSize: "0.875rem",
          color: "#64748b",
        }}
      >
        Rename people to search by name. Re-index your media to update face
        detection.
      </p>
      {people.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
          No people detected yet. Index your photos to detect faces.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              flex: 1,
              minWidth: 200,
            }}
          >
            {people.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  backgroundColor:
                    selectedId === p.id ? "#eef2ff" : "#f1f5f9",
                  borderRadius: 8,
                  border:
                    selectedId === p.id
                      ? "2px solid #4f46e5"
                      : "2px solid transparent",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setSelectedId((prev) => (prev === p.id ? null : p.id))
                }
              >
                {editing === p.id ? (
                  <>
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") handleSave(p.id);
                        if (e.key === "Escape") setEditing(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        fontSize: "0.875rem",
                        width: 140,
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(p.id);
                      }}
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                        borderRadius: 6,
                        border: "none",
                        background: "#4f46e5",
                        color: "#fff",
                      }}
                    >
                      Save
                    </button>
                  </>
                ) : mergeFromId === p.id ? (
                  <>
                    <span style={{ fontSize: "0.9375rem" }}>
                      Merge into…
                    </span>
                    <select
                      value=""
                      onChange={(e) => {
                        const into = parseInt(e.target.value, 10);
                        if (into) handleMerge(p.id, into);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.8125rem",
                        borderRadius: 4,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <option value="">Select person</option>
                      {people
                        .filter((o) => o.id !== p.id)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMergeFromId(null);
                      }}
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        color: "#64748b",
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "0.9375rem" }}>{p.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(p.id);
                        setDraft(p.name.startsWith("Person ") ? "" : p.name);
                      }}
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        color: "#4f46e5",
                        fontWeight: 500,
                      }}
                    >
                      Rename
                    </button>
                    {people.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMergeFromId(p.id);
                        }}
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          background: "none",
                          border: "none",
                          color: "#64748b",
                          fontWeight: 500,
                        }}
                      >
                        Merge into…
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {selectedId && (
            <div
              style={{
                flex: "1 1 300px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <h3
                  style={{
                    fontSize: "0.9375rem",
                    margin: 0,
                    color: "#475569",
                  }}
                >
                  Photos
                </h3>
                {onViewAllPhotos && (
                  <button
                    type="button"
                    onClick={() => selectedId && onViewAllPhotos(selectedId)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      borderRadius: 6,
                      border: "1px solid #4f46e5",
                      background: "#eef2ff",
                      color: "#4f46e5",
                    }}
                  >
                    View all in gallery
                  </button>
                )}
              </div>
              {previewLoading ? (
                <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                  Loading…
                </p>
              ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: 8,
                }}
              >
                {previewMedia
                  .filter((m) => m.mimeType.startsWith("image/"))
                  .map((m) => {
                    const hasBox = selectedId && m.x != null && m.width != null && m.width > 0;
                    const thumbSrc = hasBox
                      ? `/api/media/${m.id}/face/${selectedId}`
                      : `/api/media/${m.id}/preview`;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setViewingMedia(m)}
                        style={{
                          padding: 0,
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          display: "block",
                          aspectRatio: "1",
                          borderRadius: 8,
                          overflow: "hidden",
                          backgroundColor: "#f1f5f9",
                        }}
                      >
                        <img
                          src={thumbSrc}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </button>
                    );
                  })}
                {previewMedia.filter((m) => m.mimeType.startsWith("image/"))
                  .length === 0 && (
                  <p
                    style={{
                      gridColumn: "1 / -1",
                      fontSize: "0.875rem",
                      color: "#64748b",
                    }}
                  >
                    No photos
                  </p>
                )}
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {viewingMedia && selectedId && (
        <div
          onClick={() => setViewingMedia(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.9)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 0,
              width: "100%",
            }}
          >
            <img
              src={`/api/media/${viewingMedia.id}/preview`}
              alt=""
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 16,
              flexShrink: 0,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setViewingMedia(null);
                setReassigning(false);
              }}
              style={{
                padding: "10px 24px",
                fontSize: "0.9375rem",
                fontWeight: 500,
                cursor: "pointer",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#1e293b",
              }}
            >
              Close
            </button>
            {reassigning ? (
              <>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                  Reassign to:
                </span>
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "new") {
                      handleReassign(viewingMedia.id, "new");
                    } else if (v) {
                      handleReassign(viewingMedia.id, parseInt(v, 10));
                    }
                  }}
                  style={{
                    padding: "8px 12px",
                    fontSize: "0.875rem",
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <option value="">Select person</option>
                  {people
                    .filter((p) => p.id !== selectedId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  <option value="new">Create new person</option>
                </select>
                <button
                  type="button"
                  onClick={() => setReassigning(false)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    color: "#64748b",
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setReassigning(true)}
                  style={{
                    padding: "10px 24px",
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#1e293b",
                  }}
                >
                  Reassign
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveFromPhoto(viewingMedia.id)}
                  style={{
                    padding: "10px 24px",
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    borderRadius: 8,
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                  }}
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

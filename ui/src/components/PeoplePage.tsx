import { useCallback, useEffect, useRef, useState } from "react";

interface Person {
  id: number;
  name: string;
  photoCount?: number;
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

const styles = {
  page: {
    display: "flex",
    gap: 0,
    minHeight: 0,
    flex: 1,
    overflow: "hidden",
  } as const,
  sidebar: {
    width: 280,
    minWidth: 280,
    flexShrink: 0,
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column" as const,
    backgroundColor: "#fafafa",
  } as const,
  sidebarHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#fff",
  } as const,
  sidebarTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1e293b",
  } as const,
  sidebarSubtitle: {
    margin: "4px 0 0",
    fontSize: "0.8125rem",
    color: "#64748b",
  } as const,
  peopleList: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "8px 0",
  } as const,
  personRow: (selected: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    margin: "0 8px",
    borderRadius: 8,
    cursor: "pointer",
    border: "none",
    width: "calc(100% - 16px)",
    textAlign: "left" as const,
    backgroundColor: selected ? "#eef2ff" : "transparent",
    color: "#1e293b",
    transition: "background-color 0.15s",
  } as const),
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    backgroundColor: "#e2e8f0",
    flexShrink: 0,
    overflow: "hidden" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
    color: "#64748b",
  } as const,
  personInfo: {
    flex: 1,
    minWidth: 0,
  } as const,
  personName: {
    fontSize: "0.9375rem",
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  } as const,
  personCount: {
    fontSize: "0.75rem",
    color: "#64748b",
    marginTop: 2,
  } as const,
  menuButton: {
    padding: 4,
    borderRadius: 6,
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#64748b",
    fontSize: "1.125rem",
    lineHeight: 1,
    flexShrink: 0,
  } as const,
  detail: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
    padding: 24,
    backgroundColor: "#fff",
  } as const,
  detailEmpty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    fontSize: "0.9375rem",
  } as const,
  detailHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    flexWrap: "wrap" as const,
    gap: 12,
  } as const,
  detailTitle: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#1e293b",
  } as const,
  detailMeta: {
    fontSize: "0.875rem",
    color: "#64748b",
    marginTop: 4,
  } as const,
  primaryButton: {
    padding: "8px 16px",
    fontSize: "0.875rem",
    fontWeight: 500,
    borderRadius: 8,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    cursor: "pointer",
  } as const,
  secondaryButton: {
    padding: "8px 16px",
    fontSize: "0.875rem",
    fontWeight: 500,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
  } as const,
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 12,
    overflowY: "auto" as const,
    alignContent: "start",
  } as const,
  photoThumb: {
    padding: 0,
    border: "none",
    background: "none",
    cursor: "pointer",
    display: "block",
    aspectRatio: "1",
    borderRadius: 8,
    overflow: "hidden" as const,
    backgroundColor: "#f1f5f9",
  } as const,
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  } as const,
  modal: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    minWidth: 320,
    maxWidth: "100%",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  } as const,
  modalTitle: {
    margin: "0 0 16px",
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#1e293b",
  } as const,
  modalActions: {
    display: "flex",
    gap: 12,
    marginTop: 20,
    justifyContent: "flex-end",
  } as const,
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "0.9375rem",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    boxSizing: "border-box" as const,
  } as const,
  select: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "0.9375rem",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    backgroundColor: "#fff",
    marginTop: 8,
  } as const,
  dangerButton: {
    padding: "8px 16px",
    fontSize: "0.875rem",
    fontWeight: 500,
    borderRadius: 8,
    border: "none",
    background: "#dc2626",
    color: "#fff",
    cursor: "pointer",
  } as const,
  dropdown: {
    position: "absolute" as const,
    right: 0,
    top: "100%",
    marginTop: 4,
    minWidth: 180,
    background: "#fff",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
    padding: "4px 0",
    zIndex: 100,
  } as const,
  dropdownItem: {
    display: "block",
    width: "100%",
    padding: "10px 16px",
    border: "none",
    background: "none",
    textAlign: "left" as const,
    fontSize: "0.875rem",
    color: "#475569",
    cursor: "pointer",
  } as const,
};

export function PeoplePage({ onUpdate, onViewAllPhotos }: PeoplePageProps) {
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
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleSaveName = useCallback(
    async () => {
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
    },
    [editModal, editDraft, fetchPeople, onUpdate]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewingMedia(null);
        setEditModal(null);
        setMergeModal(null);
        setMenuOpen(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const selectedPerson = people.find((p) => p.id === selectedId);
  const photoCount =
    selectedPerson?.photoCount ?? previewMedia.filter((m) => m.mimeType.startsWith("image/")).length;

  if (loading) {
    return (
      <div style={{ padding: 24, color: "#64748b", fontSize: "0.875rem" }}>
        Loading people…
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>People</h2>
          <p style={styles.sidebarSubtitle}>
            {people.length} {people.length === 1 ? "person" : "people"} detected
          </p>
        </div>
        <div style={styles.peopleList}>
          {people.length === 0 ? (
            <p style={{ padding: 20, color: "#64748b", fontSize: "0.875rem" }}>
              No people yet. Index your photos to detect faces.
            </p>
          ) : (
            people.map((p) => (
              <div key={p.id} style={{ position: "relative" }} ref={menuOpen === p.id ? menuRef : undefined}>
                <button
                  type="button"
                  style={{
                    ...styles.personRow(selectedId === p.id),
                  }}
                  onClick={() => {
                    setSelectedId((prev) => (prev === p.id ? null : p.id));
                    setMenuOpen(null);
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== p.id) {
                      e.currentTarget.style.backgroundColor = "#f1f5f9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== p.id) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <div style={styles.avatar}>
                    {p.name.startsWith("Person ") ? (
                      <span>👤</span>
                    ) : (
                      <span style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={styles.personInfo}>
                    <div style={styles.personName}>{p.name}</div>
                    <div style={styles.personCount}>
                      {(p.photoCount ?? 0)} {(p.photoCount ?? 0) === 1 ? "photo" : "photos"}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={styles.menuButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen((prev) => (prev === p.id ? null : p.id));
                    }}
                    title="Actions"
                    aria-label="Actions"
                  >
                    ⋮
                  </button>
                </button>
                {menuOpen === p.id && (
                  <div style={styles.dropdown}>
                    <button
                      type="button"
                      style={styles.dropdownItem}
                      onClick={() => {
                        setEditModal(p);
                        setEditDraft(p.name.startsWith("Person ") ? "" : p.name);
                        setMenuOpen(null);
                      }}
                    >
                      Edit name
                    </button>
                    {people.length > 1 && (
                      <button
                        type="button"
                        style={styles.dropdownItem}
                        onClick={() => {
                          setMergeModal(p);
                          setMenuOpen(null);
                        }}
                      >
                        Merge into another person
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      <main style={styles.detail}>
        {!selectedId ? (
          <div style={styles.detailEmpty}>
            Select a person to view their photos
          </div>
        ) : (
          <>
            <div style={styles.detailHeader}>
              <div>
                <h2 style={styles.detailTitle}>{selectedPerson?.name ?? "Unknown"}</h2>
                <p style={styles.detailMeta}>
                  {photoCount} {(photoCount === 1 ? "photo" : "photos")}
                </p>
              </div>
              {onViewAllPhotos && (
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => selectedId && onViewAllPhotos(selectedId)}
                >
                  View all in gallery
                </button>
              )}
            </div>
            {previewLoading ? (
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading photos…</p>
            ) : (
              <div style={styles.photoGrid}>
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
                        style={styles.photoThumb}
                        onClick={() => setViewingMedia(m)}
                      >
                        <img
                          src={thumbSrc}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </button>
                    );
                  })}
                {previewMedia.filter((m) => m.mimeType.startsWith("image/")).length === 0 && (
                  <p style={{ gridColumn: "1 / -1", color: "#64748b", fontSize: "0.875rem" }}>
                    No photos
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {editModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setEditModal(null)}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Edit name</h3>
            <input
              type="text"
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") setEditModal(null);
              }}
              placeholder="Enter name"
              autoFocus
              style={styles.input}
            />
            <div style={styles.modalActions}>
              <button type="button" style={styles.secondaryButton} onClick={() => setEditModal(null)}>
                Cancel
              </button>
              <button type="button" style={styles.primaryButton} onClick={handleSaveName}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {mergeModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            setMergeModal(null);
            setMergeTargetId("");
          }}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Merge &quot;{mergeModal.name}&quot; into</h3>
            <p style={{ margin: "0 0 8px", fontSize: "0.875rem", color: "#64748b" }}>
              All photos of {mergeModal.name} will be reassigned to the selected person.
            </p>
            <select
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              style={styles.select}
            >
              <option value="">Select person</option>
              {people
                .filter((p) => p.id !== mergeModal.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  setMergeModal(null);
                  setMergeTargetId("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => {
                  const target = parseInt(mergeTargetId, 10);
                  if (!isNaN(target)) {
                    handleMerge(mergeModal.id, target);
                  }
                }}
                disabled={!mergeTargetId}
              >
                Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingMedia && selectedId && (
        <div
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
          onClick={() => setViewingMedia(null)}
        >
          <div
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
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" style={styles.secondaryButton} onClick={() => setViewingMedia(null)}>
              Close
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Reassign to:</label>
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "new") handleReassign(viewingMedia.id, "new");
                  else if (v) handleReassign(viewingMedia.id, parseInt(v, 10));
                  e.target.value = "";
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: "0.875rem",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#1e293b",
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
            </div>
            <button
              type="button"
              style={styles.dangerButton}
              onClick={() => handleRemoveFromPhoto(viewingMedia.id)}
            >
              Remove from photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

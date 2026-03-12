import { useCallback, useEffect, useRef, useState } from "react";

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

interface MediaViewerProps {
  item: MediaItem | null;
  onClose: () => void;
  onUpdate?: () => void;
}

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TaggedFace extends FaceBox {
  personId: number;
  name: string;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

function isText(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  );
}

export function MediaViewer({ item, onClose, onUpdate }: MediaViewerProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [taggingMode, setTaggingMode] = useState(false);
  const [faces, setFaces] = useState<{ detected: FaceBox[]; tagged: TaggedFace[] } | null>(null);
  const [facesLoading, setFacesLoading] = useState(false);
  const [assigningFace, setAssigningFace] = useState<FaceBox | null>(null);
  const [reassigningFace, setReassigningFace] = useState<TaggedFace | null>(null);
  const [people, setPeople] = useState<Array<{ id: number; name: string }>>([]);
  const imgRef = useRef<HTMLImageElement>(null);

  const loadFaces = useCallback(async () => {
    if (!item?.id) return;
    setFacesLoading(true);
    try {
      const [facesRes, peopleRes] = await Promise.all([
        fetch(`/api/media/${item.id}/faces`),
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
  }, [item?.id]);

  useEffect(() => {
    if (taggingMode && item?.id) loadFaces();
    else setFaces(null);
  }, [taggingMode, item?.id, loadFaces]);

  const getImageCoords = useCallback((e: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  }, []);

  const overlaps = useCallback((a: FaceBox, b: FaceBox) => {
    const interLeft = Math.max(a.x, b.x);
    const interTop = Math.max(a.y, b.y);
    const interRight = Math.min(a.x + a.width, b.x + b.width);
    const interBottom = Math.min(a.y + a.height, b.y + b.height);
    if (interRight <= interLeft || interBottom <= interTop) return false;
    const interArea = (interRight - interLeft) * (interBottom - interTop);
    const aArea = a.width * a.height;
    return interArea / aArea > 0.3;
  }, []);

  const findFaceAt = useCallback(
    (x: number, y: number): FaceBox | null => {
      if (!faces) return null;
      for (const box of faces.detected) {
        const alreadyTagged = faces.tagged.some((t) => overlaps(box, t));
        if (!alreadyTagged && x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
          return box;
        }
      }
      return null;
    },
    [faces, overlaps]
  );

  const findTaggedFaceAt = useCallback(
    (x: number, y: number): TaggedFace | null => {
      if (!faces) return null;
      for (const t of faces.tagged) {
        if (x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height) {
          return t;
        }
      }
      return null;
    },
    [faces]
  );

  const handleImageClick = useCallback(
    (e: React.MouseEvent) => {
      if (!taggingMode || !faces) return;
      const coords = getImageCoords(e);
      if (!coords) return;
      const tagged = findTaggedFaceAt(coords.x, coords.y);
      if (tagged) {
        setReassigningFace(tagged);
        return;
      }
      const face = findFaceAt(coords.x, coords.y);
      if (face) setAssigningFace(face);
    },
    [taggingMode, faces, getImageCoords, findFaceAt, findTaggedFaceAt]
  );

  const handleAssignFace = useCallback(
    async (personId: number | "new") => {
      if (!item?.id || !assigningFace) return;
      const res = await fetch(`/api/media/${item.id}/people`, {
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
    [item?.id, assigningFace, loadFaces, onUpdate]
  );

  const handleReassignFace = useCallback(
    async (action: number | "new" | "remove") => {
      if (!item?.id || !reassigningFace) return;
      if (action === "remove") {
        const res = await fetch(`/api/media/${item.id}/people/${reassigningFace.personId}`, {
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
        const res = await fetch(`/api/media/${item.id}/people/${reassigningFace.personId}/reassign-new`, {
          method: "POST",
        });
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
      const res = await fetch(`/api/media/${item.id}/people/${reassigningFace.personId}`, {
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
    [item?.id, reassigningFace, loadFaces, onUpdate]
  );

  useEffect(() => {
    if (!item) return;
    if (isText(item.mimeType)) {
      fetch(`/api/media/${item.id}/content`)
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error("Failed to load"))))
        .then(setTextContent)
        .catch(() => setTextError("Could not load content"))
        .finally(() => {});
    } else {
      setTextContent(null);
      setTextError(null);
    }
  }, [item?.id, item?.mimeType]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (assigningFace) setAssigningFace(null);
        else if (reassigningFace) setReassigningFace(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, assigningFace, reassigningFace]);

  if (!item) return null;

  const previewUrl = `/api/media/${item.id}/preview`;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.9)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            gap: 8,
          }}
        >
          {isImage(item.mimeType) && (
            <button
              onClick={() => setTaggingMode((prev) => !prev)}
              style={{
                background: taggingMode ? "#4f46e5" : "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              {taggingMode ? "Exit tagging" : "Tagging mode"}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Close
          </button>
        </div>

        <p
          style={{
            color: "#94a3b8",
            marginBottom: 16,
            fontSize: "0.875rem",
          }}
        >
          {item.originalName}
        </p>

        {isImage(item.mimeType) && (
          <div
            style={{
              position: "relative",
              display: "inline-block",
            }}
          >
            <img
              ref={imgRef}
              src={previewUrl}
              alt={item.originalName}
              onClick={handleImageClick}
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                objectFit: "contain",
                cursor: taggingMode ? "crosshair" : "default",
              }}
            />
            {taggingMode && faces && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: "none",
                }}
              >
                {imgRef.current && (() => {
                  const img = imgRef.current;
                  const rect = img.getBoundingClientRect();
                  const scaleX = rect.width / img.naturalWidth;
                  const scaleY = rect.height / img.naturalHeight;
                  return (
                    <>
                      {faces.tagged.map((t, i) => (
                        <div
                          key={`t-${i}`}
                          style={{
                            position: "absolute",
                            left: t.x * scaleX,
                            top: t.y * scaleY,
                            width: t.width * scaleX,
                            height: t.height * scaleY,
                            border: "2px solid #22c55e",
                            borderRadius: 4,
                            color: "#22c55e",
                            fontSize: "clamp(12px, 2.5vw, 18px)",
                            fontWeight: 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            backgroundColor: "rgba(34, 197, 94, 0.25)",
                            display: "flex",
                            alignItems: "center",
                            padding: "0 4px",
                            textShadow: "0 0 2px #000, 0 1px 3px rgba(0,0,0,0.8)",
                          }}
                        >
                          {t.name}
                        </div>
                      ))}
                      {faces.detected.map((d, i) => (
                        <div
                          key={`d-${i}`}
                          style={{
                            position: "absolute",
                            left: d.x * scaleX,
                            top: d.y * scaleY,
                            width: d.width * scaleX,
                            height: d.height * scaleY,
                            border: "2px dashed rgba(255,255,255,0.6)",
                            borderRadius: 4,
                          }}
                        />
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {taggingMode && facesLoading && (
          <p style={{ color: "#94a3b8", marginTop: 8, fontSize: "0.875rem" }}>
            Detecting faces…
          </p>
        )}

        {assigningFace && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              zIndex: 1001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#1e293b",
                padding: 24,
                borderRadius: 12,
                minWidth: 280,
              }}
            >
              <p style={{ margin: "0 0 16px", color: "#e2e8f0", fontSize: "1.125rem", fontWeight: 600 }}>
                Who is this?
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "new") handleAssignFace("new");
                    else if (v) handleAssignFace(parseInt(v, 10));
                  }}
                  style={{
                    padding: "10px 14px",
                    fontSize: "1rem",
                    borderRadius: 6,
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "#e2e8f0",
                    flex: 1,
                    minWidth: 160,
                  }}
                >
                  <option value="">Select person</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="new">Create new person</option>
                </select>
                <button
                  type="button"
                  onClick={() => setAssigningFace(null)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    background: "none",
                    border: "1px solid #475569",
                    color: "#94a3b8",
                    borderRadius: 6,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {reassigningFace && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              zIndex: 1001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#1e293b",
                padding: 24,
                borderRadius: 12,
                minWidth: 280,
              }}
            >
              <p style={{ margin: "0 0 4px", color: "#e2e8f0", fontSize: "1.125rem", fontWeight: 600 }}>
                Change tag
              </p>
              <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: "0.875rem" }}>
                Currently: {reassigningFace.name}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "new") handleReassignFace("new");
                    else if (v === "remove") handleReassignFace("remove");
                    else if (v) handleReassignFace(parseInt(v, 10));
                  }}
                  style={{
                    padding: "10px 14px",
                    fontSize: "1rem",
                    borderRadius: 6,
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "#e2e8f0",
                    flex: 1,
                    minWidth: 160,
                  }}
                >
                  <option value="">Reassign to…</option>
                  {people
                    .filter((p) => p.id !== reassigningFace.personId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  <option value="new">Create new person</option>
                  <option value="remove">Remove tag</option>
                </select>
                <button
                  type="button"
                  onClick={() => setReassigningFace(null)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    background: "none",
                    border: "1px solid #475569",
                    color: "#94a3b8",
                    borderRadius: 6,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isVideo(item.mimeType) && (
          <video
            src={previewUrl}
            controls
            autoPlay
            style={{ maxWidth: "100%", maxHeight: "85vh" }}
          />
        )}

        {isText(item.mimeType) && (
          <pre
            style={{
              backgroundColor: "#1e293b",
              color: "#e2e8f0",
              padding: 24,
              borderRadius: 8,
              maxWidth: "90vw",
              maxHeight: "80vh",
              overflow: "auto",
              textAlign: "left",
              fontSize: "0.875rem",
              lineHeight: 1.5,
            }}
          >
            {textError ?? textContent ?? "Loading…"}
          </pre>
        )}

        {!isImage(item.mimeType) && !isVideo(item.mimeType) && !isText(item.mimeType) && (
          <p style={{ color: "#94a3b8" }}>
            Preview not available.{" "}
            <a href={`/api/media/${item.id}`} download={item.originalName} style={{ color: "#60a5fa" }}>
              Download
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

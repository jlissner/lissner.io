import { peopleStyles as s } from "./peopleStyles";

interface MediaPreview {
  id: string;
  mimeType: string;
}

interface PeopleImageViewerProps {
  media: MediaPreview;
  people: Array<{ id: number; name: string }>;
  selectedId: number;
  onClose: () => void;
  onReassign: (mediaId: string, assignTo: number | "new") => void;
  onRemove: (mediaId: string) => void;
}

export function PeopleImageViewer({
  media,
  people,
  selectedId,
  onClose,
  onReassign,
  onRemove,
}: PeopleImageViewerProps) {
  return (
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
      onClick={onClose}
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
          src={`/api/media/${media.id}/preview`}
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
        <button type="button" style={s.secondaryButton} onClick={onClose}>
          Close
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Reassign to:</label>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "new") onReassign(media.id, "new");
              else if (v) onReassign(media.id, parseInt(v, 10));
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
        <button type="button" style={s.dangerButton} onClick={() => onRemove(media.id)}>
          Remove from photo
        </button>
      </div>
    </div>
  );
}

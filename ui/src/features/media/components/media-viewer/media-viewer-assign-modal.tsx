interface MediaViewerAssignModalProps {
  people: Array<{ id: number; name: string }>;
  onAssign: (personId: number | "new") => void;
  onCancel: () => void;
}

export function MediaViewerAssignModal({
  people,
  onAssign,
  onCancel,
}: MediaViewerAssignModalProps) {
  return (
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
              if (v === "new") onAssign("new");
              else if (v) onAssign(parseInt(v, 10));
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
            onClick={onCancel}
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
  );
}

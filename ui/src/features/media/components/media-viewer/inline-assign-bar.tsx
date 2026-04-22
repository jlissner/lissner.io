import type { FaceBox } from "./media-viewer-types";

interface InlineAssignBarProps {
  box: FaceBox;
  imgRef: React.RefObject<HTMLImageElement | null>;
  people: Array<{ id: number; name: string }>;
  onAssign: (personId: number | "new") => void;
  onCancel: () => void;
}

export function InlineAssignBar({
  box,
  imgRef,
  people,
  onAssign,
  onCancel,
}: InlineAssignBarProps) {
  const img = imgRef.current;
  if (!img) return null;

  const imgRect = img.getBoundingClientRect();
  const naturalHeight = img.naturalHeight || 1;
  const scaleY = imgRect.height / naturalHeight;

  const screenX = box.x * (imgRect.width / (img.naturalWidth || 1));
  const screenY = box.y * scaleY;
  const screenHeight = box.height * scaleY;

  const barWidth = 340;
  const barLeft = imgRect.left + Math.min(screenX, imgRect.width - barWidth);
  const barTop = imgRect.top + screenY + screenHeight + 12;

  return (
    <div
      style={{
        position: "fixed",
        left: barLeft,
        top: barTop,
        zIndex: 2000,
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        padding: "12px 16px",
        borderRadius: 8,
        display: "flex",
        gap: 8,
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        maxWidth: "calc(100vw - 40px)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        style={{
          color: "var(--color-text)",
          fontSize: "0.875rem",
          whiteSpace: "nowrap",
        }}
      >
        Who is this?
      </span>
      <select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v === "new") onAssign("new");
          else if (v) onAssign(parseInt(v, 10));
        }}
        style={{
          padding: "6px 10px",
          fontSize: "0.875rem",
          borderRadius: 6,
          border: "1px solid var(--color-border)",
          background: "var(--color-bg)",
          color: "var(--color-text)",
          minWidth: 120,
        }}
      >
        <option value="">Select...</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        <option value="new">New person</option>
      </select>
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: "6px 12px",
          fontSize: "0.875rem",
          cursor: "pointer",
          background: "none",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-muted)",
          borderRadius: 6,
        }}
      >
        Cancel
      </button>
    </div>
  );
}

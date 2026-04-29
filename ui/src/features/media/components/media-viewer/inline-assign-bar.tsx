import type { FaceBox } from "./media-viewer-types";
import { useState } from "react";
import {
  PersonSelect,
  type PersonSelectValue,
} from "@/features/people/components/PersonSelect";
import { createPerson } from "@/features/people/api";

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
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleChange = async (value: PersonSelectValue) => {
    if (typeof value === "number") {
      onAssign(value);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const result = await createPerson(value.createName);
      onAssign(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create person");
    } finally {
      setCreating(false);
    }
  };

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
      <PersonSelect
        people={people}
        allowCreate={true}
        placeholder="Who is this?"
        onChange={handleChange}
        disabled={creating}
      />
      {creating && (
        <span
          style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}
        >
          Creating...
        </span>
      )}
      {error && (
        <span style={{ fontSize: "0.875rem", color: "var(--color-danger)" }}>
          {error}
        </span>
      )}
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

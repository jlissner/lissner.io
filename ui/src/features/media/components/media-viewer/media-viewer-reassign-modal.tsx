import type { TaggedFace } from "./media-viewer-types";
import { useState } from "react";
import {
  PersonSelect,
  type PersonSelectValue,
} from "@/features/people/components/PersonSelect";
import { createPerson } from "@/features/people/api";

interface MediaViewerReassignModalProps {
  reassigningFace: TaggedFace;
  people: Array<{ id: number; name: string }>;
  onReassign: (action: number | "new" | "remove") => void;
  onCancel: () => void;
}

export function MediaViewerReassignModal({
  reassigningFace,
  people,
  onReassign,
  onCancel,
}: MediaViewerReassignModalProps) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherPeople = people.filter((p) => p.id !== reassigningFace.personId);

  const handleChange = async (value: PersonSelectValue) => {
    if (typeof value === "number") {
      onReassign(value);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const result = await createPerson(value.createName);
      onReassign(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create person");
    } finally {
      setCreating(false);
    }
  };

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
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          padding: 24,
          borderRadius: 12,
          minWidth: 280,
        }}
      >
        <p
          style={{
            margin: "0 0 4px",
            color: "var(--color-text)",
            fontSize: "1.125rem",
            fontWeight: 600,
          }}
        >
          Change tag
        </p>
        <p
          style={{
            margin: "0 0 16px",
            color: "var(--color-text-muted)",
            fontSize: "0.875rem",
          }}
        >
          Currently: {reassigningFace.name}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PersonSelect
            people={otherPeople}
            excludeIds={[reassigningFace.personId]}
            allowCreate={true}
            placeholder="Reassign to…"
            onChange={handleChange}
            disabled={creating}
            style={{ flex: 1, minWidth: 160 }}
          />
          <button
            type="button"
            onClick={() => onReassign("remove")}
            style={{
              padding: "8px 16px",
              fontSize: "0.875rem",
              cursor: "pointer",
              background: "none",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              borderRadius: 6,
            }}
          >
            Remove tag
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "8px 16px",
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
        {creating && (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            Creating...
          </p>
        )}
        {error && (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "0.875rem",
              color: "var(--color-danger)",
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

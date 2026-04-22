import { useCallback, useEffect, useState } from "react";
import { listPeople, updatePerson } from "../api";

interface Person {
  id: number;
  name: string;
}

interface PeopleListProps {
  onUpdate?: () => void;
}

export function PeopleList({ onUpdate }: PeopleListProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const fetchPeople = useCallback(async () => {
    setPeople((await listPeople()) as Person[]);
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const handleSave = useCallback(
    async (id: number) => {
      const name = draft.trim();
      if (!name) {
        setEditing(null);
        return;
      }
      try {
        await updatePerson(id, name);
        setEditing(null);
        await fetchPeople();
        onUpdate?.();
      } catch {
        // Keep existing quiet failure behavior in this legacy panel.
      }
    },
    [draft, fetchPeople, onUpdate],
  );

  if (people.length === 0) return null;

  return (
    <details style={{ marginBottom: "1.5rem" }}>
      <summary
        style={{ cursor: "pointer", fontSize: "0.9375rem", fontWeight: 500 }}
        title="People detected in your photos. Rename to search by name (re-index to update search)."
      >
        People ({people.length})
      </summary>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {people.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              backgroundColor: "var(--color-bg-subtle)",
              borderRadius: 8,
            }}
          >
            {editing === p.id ? (
              <>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(p.id);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  autoFocus
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-elevated)",
                    color: "var(--color-text)",
                    fontSize: "0.875rem",
                    width: 120,
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSave(p.id)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: "0.875rem" }}>{p.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(p.id);
                    setDraft(p.name.startsWith("Person ") ? "" : p.name);
                  }}
                  style={{
                    padding: "2px 6px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    color: "var(--color-primary)",
                  }}
                >
                  Rename
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

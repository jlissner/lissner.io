import { useCallback, useEffect, useState } from "react";

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
    const res = await fetch("/api/people");
    if (res.ok) {
      const data = await res.json();
      setPeople(data);
    }
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
              backgroundColor: "#f1f5f9",
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
                    border: "1px solid #e2e8f0",
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
                    color: "#4f46e5",
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

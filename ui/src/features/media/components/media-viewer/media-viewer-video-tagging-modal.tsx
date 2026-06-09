import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/api";
import { Button } from "@/components/ui/button";
import {
  PersonSelect,
  type PersonSelectValue,
} from "@/features/people/components/PersonSelect";
import { createPerson } from "@/features/people/api";
import {
  addPersonToMedia,
  getMediaDetails,
  removePersonFromMedia,
} from "@/features/media/api";

interface MediaViewerVideoTaggingModalProps {
  mediaId: string;
  people: Array<{ id: number; name: string }>;
  onClose: () => void;
  onChanged: () => void;
}

export function MediaViewerVideoTaggingModal({
  mediaId,
  people,
  onClose,
  onChanged,
}: MediaViewerVideoTaggingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taggedPeople, setTaggedPeople] = useState<string[]>([]);

  const loadTaggedPeople = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const details = await getMediaDetails(mediaId);
      setTaggedPeople(details.people ?? []);
    } catch {
      setError("Could not load tagged people");
      setTaggedPeople([]);
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    void loadTaggedPeople();
  }, [loadTaggedPeople]);

  const taggedPeopleWithIds = taggedPeople.map((name) => {
    const matches = people.filter((p) => p.name === name);
    if (matches.length === 1) return { name, personId: matches[0].id };
    return { name, personId: null };
  });

  const handleRemove = async (personId: number) => {
    try {
      await removePersonFromMedia(mediaId, personId);
      await loadTaggedPeople();
      onChanged();
    } catch (err) {
      setError(errorMessage(err, "Failed to remove tag"));
    }
  };

  const handleAdd = async (value: PersonSelectValue) => {
    try {
      const personId =
        typeof value === "number"
          ? value
          : await (async () => {
              setLoading(true);
              const result = await createPerson(value.createName);
              return result.id;
            })();
      await addPersonToMedia(mediaId, { personId });
      await loadTaggedPeople();
      onChanged();
    } catch (err) {
      setError(errorMessage(err, "Failed to add tag"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Tag people"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 2500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(520px, 95vw)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1rem" }}>Tag people</h3>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                marginBottom: 6,
              }}
            >
              Currently tagged
            </div>
            {loading && <div style={{ fontSize: "0.875rem" }}>Loading…</div>}
            {error != null && (
              <div
                role="alert"
                style={{ fontSize: "0.875rem", color: "var(--color-danger)" }}
              >
                {error}
              </div>
            )}
            {!loading && taggedPeopleWithIds.length === 0 && (
              <div style={{ fontSize: "0.875rem" }}>No one tagged yet.</div>
            )}
            {!loading && taggedPeopleWithIds.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {taggedPeopleWithIds.map((p) => (
                  <li
                    key={p.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "4px 0",
                    }}
                  >
                    <span>{p.name}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={p.personId == null}
                      onClick={() => {
                        if (p.personId == null) return;
                        void handleRemove(p.personId);
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                marginTop: 6,
              }}
            >
              If a name can’t be matched to a unique person, removal is
              disabled.
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                marginBottom: 6,
              }}
            >
              Add person
            </div>
            <PersonSelect
              people={people}
              allowCreate={true}
              placeholder="Select…"
              onChange={(value: PersonSelectValue) => void handleAdd(value)}
              disabled={loading}
              style={{ minWidth: 220, maxWidth: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

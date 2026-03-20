import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface ReviewItem {
  mediaId: string;
  personId: number;
  confidence: number | null;
  isSingleFace: boolean;
  otherPeopleInPhoto?: Array<{ id: number; name: string }>;
}

export function ReviewPage({ onUpdate }: { onUpdate: () => void }) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [people, setPeople] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, peopleRes] = await Promise.all([
        fetch("/api/people/review/queue?limit=100"),
        fetch("/api/people"),
      ]);
      if (queueRes.ok) setItems(await queueRes.json());
      if (peopleRes.ok) {
        const p = await peopleRes.json();
        setPeople(new Map(p.map((x: { id: number; name: string }) => [x.id, x.name])));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    const onRefresh = () => fetchQueue();
    window.addEventListener("review-queue-refresh", onRefresh);
    return () => window.removeEventListener("review-queue-refresh", onRefresh);
  }, [fetchQueue]);

  const current = items[index];
  const handleConfirm = useCallback(async () => {
    if (!current) return;
    const res = await fetch(`/api/media/${current.mediaId}/people/${current.personId}/confirm`, {
      method: "POST",
    });
    if (res.ok) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      if (index >= items.length - 1) setIndex(Math.max(0, index - 1));
      onUpdate();
    }
  }, [current, index, items.length, onUpdate]);

  const handleSameAs = useCallback(
    async (_existingPersonId: number) => {
      if (!current) return;
      const res = await fetch(`/api/media/${current.mediaId}/people/${current.personId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((_, i) => i !== index));
        if (index >= items.length - 1) setIndex(Math.max(0, index - 1));
        onUpdate();
        window.dispatchEvent(new CustomEvent("review-queue-refresh"));
      }
    },
    [current, index, items.length, onUpdate]
  );

  const handleDiscard = useCallback(async () => {
    if (!current) return;
    if (
      !confirm(
        "Remove this face tag from the photo? If this is the only photo of this person, they will have 0 photos."
      )
    )
      return;
    const res = await fetch(`/api/media/${current.mediaId}/people/${current.personId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      if (index >= items.length - 1) setIndex(Math.max(0, index - 1));
      onUpdate();
    }
  }, [current, index, items.length, onUpdate]);

  const handleDiscardPerson = useCallback(async () => {
    if (!current) return;
    if (!confirm("Delete this person entirely? All their face tags will be removed.")) return;
    const res = await fetch(`/api/people/${current.personId}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      if (index >= items.length - 1) setIndex(Math.max(0, index - 1));
      onUpdate();
    }
  }, [current, index, items.length, onUpdate]);

  const handleReassign = useCallback(
    async (toPersonId: number) => {
      if (!current || toPersonId === current.personId) return;
      const res = await fetch(`/api/media/${current.mediaId}/people/${current.personId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignTo: toPersonId }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((_, i) => i !== index));
        if (index >= items.length - 1) setIndex(Math.max(0, index - 1));
        onUpdate();
      }
    },
    [current, index, items.length, onUpdate]
  );

  if (loading) {
    return <p className="empty">Loading…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="empty u-text-success">
        No faces need review. All face matches are confident or you haven&apos;t indexed yet.
      </p>
    );
  }

  const personName = people.get(current.personId) ?? `Person ${current.personId}`;
  const confPct = current.confidence != null ? Math.round(current.confidence * 100) : null;

  return (
    <div className="review">
      <h2 className="review__title">Review faces ({items.length} remaining)</h2>
      <div className="review__layout">
        <div className="review__media">
          <img src={`/api/media/${current.mediaId}/preview`} alt="" />
          <p className="u-mt-2 u-text-muted u-text-sm">
            Face tagged as <strong>{personName}</strong>
            {confPct != null && (
              <span>
                {" "}
                ({confPct}% match{current.isSingleFace ? ", new face" : ""})
              </span>
            )}
          </p>
        </div>
        <div className="review__actions">
          <p className="review__actions-title">Is this correct?</p>
          <div className="review__actions-list">
            <Button variant="success" onClick={handleConfirm}>
              ✓ Correct
            </Button>
            {current.otherPeopleInPhoto && current.otherPeopleInPhoto.length > 0 && (
              <>
                <p className="u-text-sm u-text-muted u-mt-2 u-mb-1">
                  Or same as someone already in photo:
                </p>
                {current.otherPeopleInPhoto.map(({ id, name }) => (
                  <Button key={id} variant="secondary" onClick={() => handleSameAs(id)}>
                    Same as {name} (remove duplicate)
                  </Button>
                ))}
              </>
            )}
            <Button variant="secondary" onClick={handleDiscard}>
              Remove tag from this photo
            </Button>
            <Button
              variant="secondary"
              style={{ borderColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}
              onClick={handleDiscardPerson}
            >
              Discard person entirely
            </Button>
            <div className="review__reassign">
              <label className="review__reassign-label">Reassign to:</label>
              <select
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) handleReassign(parseInt(v, 10));
                }}
                className="form__select"
              >
                <option value="">Select person…</option>
                {[...people.entries()]
                  .filter(([id]) => id !== current.personId)
                  .map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="review__nav">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              Previous
            </Button>
            <span className="u-text-sm" style={{ alignSelf: "center" }}>
              {index + 1} / {items.length}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
              disabled={index >= items.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

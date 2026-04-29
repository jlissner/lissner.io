import { useCallback, useMemo, useState } from "react";
import { ApiError } from "@/api";
import { Button } from "@/components/ui/button";
import { PixelMpOrImageVideoPreview } from "@/features/media/components/media-viewer/pixel-mp-preview";
import {
  ModalBody,
  ModalPanel,
  ModalRoot,
  ModalTitle,
  ModalActions,
} from "@/components/ui/modal";
import {
  deletePerson,
  mergePeople,
  removeTagFromMedia,
  updatePerson,
} from "../api";
import { Person } from "./people-types";
import { PersonSelect } from "./PersonSelect";
import { FaceMatchAutoMerged, FaceMatchReviewItem } from "@shared";

function pluralize(base: string, count: number): string {
  return count === 1 ? base : `${base}s`;
}

function deletePersonButtonLabel(faceTagCount: number | undefined): string {
  if (faceTagCount == null) {
    return "Delete person (all face tags)";
  }
  return `Delete person (${faceTagCount} face ${pluralize("tag", faceTagCount)})`;
}

function deletePersonConfirmMessage(
  placeholderName: string,
  count: number | undefined,
): string {
  if (count == null) {
    return `Delete "${placeholderName}"? All face tags for this person will be removed.`;
  }
  return `Delete "${placeholderName}"? This will remove ${count} face ${pluralize("tag", count)}.`;
}

function faceMatchPreviewSrc(current: FaceMatchReviewItem): string | null {
  if (!current.previewMediaId) return null;
  if (current.previewFaceCrop) {
    return `/api/media/${current.previewMediaId}/face/${current.placeholderPersonId}`;
  }
  return `/api/media/${current.previewMediaId}/preview`;
}

function MatchFaceReviewCard({
  current,
  namedPeople,
  busy,
  doneCount,
  totalReview,
  onAcceptTop,
  onMergeOther,
  onRename,
  onDiscard,
  onRemoveTagFromPreview,
  onDeletePerson,
}: {
  current: FaceMatchReviewItem;
  namedPeople: Person[];
  busy: boolean;
  doneCount: number;
  totalReview: number;
  onAcceptTop: () => void;
  onMergeOther: (targetId: number) => void;
  onRename: (name: string) => void;
  onDiscard: () => void;
  onRemoveTagFromPreview: () => void;
  onDeletePerson: () => void;
}) {
  const namedOptions = useMemo(
    () => namedPeople.filter((p) => !p.name.trim().startsWith("Person")),
    [namedPeople],
  );

  const defaultOtherId = useMemo(() => {
    const prefer =
      current.otherMatches[0]?.personId ??
      namedOptions.find((p) => p.id !== current.topMatch?.personId)?.id ??
      namedOptions[0]?.id;
    return prefer != null ? String(prefer) : "";
  }, [current.otherMatches, current.topMatch?.personId, namedOptions]);

  const [otherTargetId, setOtherTargetId] = useState(defaultOtherId);
  const [renameDraft, setRenameDraft] = useState("");

  const faceTagCount = useMemo(() => {
    const p = namedPeople.find((x) => x.id === current.placeholderPersonId);
    return p?.photoCount;
  }, [namedPeople, current.placeholderPersonId]);

  return (
    <section className="match-faces-modal__section" aria-label="Review">
      <p className="match-faces-modal__progress">
        Review {doneCount + 1} of {totalReview}
      </p>
      <div className="match-faces-modal__card">
        <div className="match-faces-modal__preview-wrap">
          <div className="match-faces-modal__preview">
            {current.previewMediaId ? (
              current.previewFaceCrop ? (
                <img
                  src={faceMatchPreviewSrc(current) ?? ""}
                  alt={`${current.placeholderName} face preview`}
                  className="match-faces-modal__preview-img"
                />
              ) : (
                <PixelMpOrImageVideoPreview
                  src={faceMatchPreviewSrc(current) ?? ""}
                  alt={`${current.placeholderName} source media preview`}
                  className="match-faces-modal__preview-img"
                />
              )
            ) : (
              <div className="match-faces-modal__preview-placeholder">
                No preview
              </div>
            )}
          </div>
          {current.previewMediaId && (
            <p className="match-faces-modal__preview-caption">
              {current.previewFaceCrop
                ? "Tagged face region for this placeholder"
                : "Full image — no face box stored for this tag"}
            </p>
          )}
        </div>
        <div className="match-faces-modal__info">
          <h3 className="match-faces-modal__name">{current.placeholderName}</h3>
          {!current.hasFaceDescriptors && (
            <p className="match-faces-modal__warn">
              No usable face samples were extracted for this person — merge or
              name with care.
            </p>
          )}
          {current.topMatch ? (
            <p className="match-faces-modal__top">
              Top match: <strong>{current.topMatch.name}</strong>{" "}
              <span className="u-text-muted">
                ({Math.round(current.topMatch.score * 100)}%)
              </span>
            </p>
          ) : (
            <p className="u-text-muted u-text-sm">
              No strong match to a named person.
            </p>
          )}
        </div>
      </div>

      <div className="match-faces-modal__actions-grid">
        <Button
          type="button"
          disabled={busy || !current.topMatch}
          onClick={onAcceptTop}
        >
          Merge into top match
        </Button>
        <div className="match-faces-modal__merge-other">
          <label
            className="match-faces-modal__label"
            htmlFor="match-faces-merge-into"
          >
            Merge into someone else
          </label>
          <div className="match-faces-modal__row">
            <PersonSelect
              id="match-faces-merge-into"
              className="match-faces-modal__select"
              people={namedOptions}
              onChange={(value) => {
                if (typeof value === "number") {
                  setOtherTargetId(String(value));
                }
              }}
              disabled={busy || namedOptions.length === 0}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy || namedOptions.length === 0}
              onClick={() => {
                const target = parseInt(otherTargetId, 10);
                if (Number.isNaN(target)) {
                  alert("Choose someone to merge into.");
                  return;
                }
                onMergeOther(target);
              }}
            >
              Merge
            </Button>
          </div>
        </div>
        <div className="match-faces-modal__rename">
          <label
            className="match-faces-modal__label"
            htmlFor="match-faces-rename"
          >
            Name as a new person
          </label>
          <div className="match-faces-modal__row">
            <input
              id="match-faces-rename"
              type="text"
              className="match-faces-modal__input"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              placeholder="Full name"
              disabled={busy}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => onRename(renameDraft.trim())}
            >
              Save name
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={onDiscard}
        >
          Skip for now
        </Button>
        <div
          className="match-faces-modal__bad-match"
          aria-label="Wrong or not a face"
        >
          <p className="match-faces-modal__bad-match-title">
            Wrong tag or not a face?
          </p>
          {current.previewMediaId ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onRemoveTagFromPreview}
            >
              Remove tag from this photo
            </Button>
          ) : (
            <p className="match-faces-modal__bad-match-hint u-text-muted u-text-sm">
              No preview image — use delete below if this person should be
              removed entirely.
            </p>
          )}
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={onDeletePerson}
          >
            {deletePersonButtonLabel(faceTagCount)}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function PeopleMatchFacesWizard({
  autoMerged,
  initialQueue,
  namedPeople,
  onClose,
  onMerged,
}: {
  autoMerged: FaceMatchAutoMerged[];
  initialQueue: FaceMatchReviewItem[];
  namedPeople: Person[];
  onClose: () => void;
  onMerged: () => void;
}) {
  const [queue, setQueue] = useState<FaceMatchReviewItem[]>(initialQueue);
  const [busy, setBusy] = useState(false);

  const current = queue[0];
  const totalReview = initialQueue.length;
  const doneCount = totalReview - queue.length;

  const popQueue = useCallback(() => {
    setQueue((q) => q.slice(1));
    onMerged();
  }, [onMerged]);

  const handleAcceptTop = useCallback(async () => {
    if (!current?.topMatch) return;
    setBusy(true);
    try {
      await mergePeople(current.placeholderPersonId, current.topMatch.personId);
      popQueue();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Merge failed";
      alert(message);
    } finally {
      setBusy(false);
    }
  }, [current, popQueue]);

  const handleMergeOther = useCallback(
    async (target: number) => {
      if (!current) return;
      setBusy(true);
      try {
        await mergePeople(current.placeholderPersonId, target);
        popQueue();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Merge failed";
        alert(message);
      } finally {
        setBusy(false);
      }
    },
    [current, popQueue],
  );

  const handleRename = useCallback(
    async (name: string) => {
      if (!current) return;
      if (!name) {
        alert("Enter a name.");
        return;
      }
      setBusy(true);
      try {
        await updatePerson(current.placeholderPersonId, name);
        popQueue();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Rename failed";
        alert(message);
      } finally {
        setBusy(false);
      }
    },
    [current, popQueue],
  );

  const handleDiscard = useCallback(() => {
    popQueue();
  }, [popQueue]);

  const handleRemoveTagFromPreview = useCallback(async () => {
    if (!current?.previewMediaId) return;
    setBusy(true);
    try {
      await removeTagFromMedia(
        current.previewMediaId,
        current.placeholderPersonId,
      );
      popQueue();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not remove tag";
      alert(message);
    } finally {
      setBusy(false);
    }
  }, [current, popQueue]);

  const handleDeletePerson = useCallback(async () => {
    if (!current) return;
    const count = namedPeople.find(
      (p) => p.id === current.placeholderPersonId,
    )?.photoCount;
    const skipConfirm =
      count === 1 && current.topMatch != null && current.topMatch.score < 0.5;
    if (!skipConfirm) {
      const confirmMsg = deletePersonConfirmMessage(
        current.placeholderName,
        count,
      );
      if (!confirm(confirmMsg)) return;
    }
    setBusy(true);
    try {
      await deletePerson(current.placeholderPersonId);
      popQueue();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not delete person";
      alert(message);
    } finally {
      setBusy(false);
    }
  }, [current, namedPeople, popQueue]);

  return (
    <ModalRoot onBackdropClick={busy ? () => {} : onClose}>
      <ModalPanel
        className="match-faces-modal"
        onEscape={busy ? undefined : onClose}
      >
        <ModalTitle id="match-faces-title">Match faces</ModalTitle>
        <ModalBody>
          {autoMerged.length > 0 && (
            <section
              className="match-faces-modal__section"
              aria-label="Auto-merged"
            >
              <p className="match-faces-modal__lead">
                Auto-merged {autoMerged.length}{" "}
                {autoMerged.length === 1 ? "placeholder" : "placeholders"}{" "}
                (≈100% match to an existing name).
              </p>
              <ul className="match-faces-modal__list">
                {autoMerged.map((m) => (
                  <li key={m.merged}>
                    <span className="u-text-muted">{m.merged}</span> →{" "}
                    <strong>{m.intoName}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {initialQueue.length === 0 ? (
            <p className="u-text-muted u-text-sm">
              {autoMerged.length === 0
                ? "No placeholder people to compare, or nothing met the review threshold."
                : "No remaining placeholders need a manual decision."}
            </p>
          ) : !current ? (
            <p className="u-text-muted">All reviewed.</p>
          ) : (
            <MatchFaceReviewCard
              key={current.placeholderPersonId}
              current={current}
              namedPeople={namedPeople}
              busy={busy}
              doneCount={doneCount}
              totalReview={totalReview}
              onAcceptTop={() => void handleAcceptTop()}
              onMergeOther={(id) => void handleMergeOther(id)}
              onRename={(name) => void handleRename(name)}
              onDiscard={handleDiscard}
              onRemoveTagFromPreview={() => void handleRemoveTagFromPreview()}
              onDeletePerson={() => void handleDeletePerson()}
            />
          )}
        </ModalBody>
        <ModalActions>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Close
          </Button>
        </ModalActions>
      </ModalPanel>
    </ModalRoot>
  );
}

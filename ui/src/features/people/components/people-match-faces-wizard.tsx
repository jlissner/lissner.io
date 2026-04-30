import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api";
import { Button } from "@/components/ui/button";
import { FullscreenImage } from "@/features/media/components/media-viewer/fullscreen-image";
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
import { PersonSelect, type PersonSelectValue } from "./PersonSelect";
import { FaceMatchReviewItem } from "@shared";

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

function faceMatchFullImageSrc(current: FaceMatchReviewItem): string | null {
  if (!current.previewMediaId) return null;
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
  onOpenFullPreview,
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
  onOpenFullPreview: () => void;
}) {
  const namedOptions = useMemo(
    () => namedPeople.filter((p) => !p.name.trim().startsWith("Person")),
    [namedPeople],
  );

  const handleMergeOrRename = (value: PersonSelectValue) => {
    if (typeof value === "number") {
      onMergeOther(value);
      return;
    }
    const name = value.createName.trim();
    if (!name) {
      return;
    }
    onRename(name);
  };

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
          <div
            className={
              current.previewMediaId
                ? "match-faces-modal__preview match-faces-modal__preview--open-full"
                : "match-faces-modal__preview"
            }
            role={current.previewMediaId ? "button" : undefined}
            tabIndex={current.previewMediaId ? 0 : undefined}
            aria-label={
              current.previewMediaId ? "Open full image in viewer" : undefined
            }
            onClick={() => {
              if (current.previewMediaId && !busy) onOpenFullPreview();
            }}
            onKeyDown={(e) => {
              if (
                !current.previewMediaId ||
                busy ||
                (e.key !== "Enter" && e.key !== " ")
              ) {
                return;
              }
              e.preventDefault();
              onOpenFullPreview();
            }}
          >
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
                ? "Tagged face region — click image for full photo"
                : "Click image to enlarge"}
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
            Merge into another person — or type a new name to rename
          </label>
          <PersonSelect
            id="match-faces-merge-into"
            className="match-faces-modal__select match-faces-modal__select--full"
            people={namedOptions}
            excludeIds={[current.placeholderPersonId]}
            allowCreate={true}
            formatCreateOption={(name) => `Rename to: ${name}`}
            placeholder="Search people or type a new name…"
            onChange={handleMergeOrRename}
            disabled={busy}
          />
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
  initialQueue,
  namedPeople,
  onClose,
  onMerged,
}: {
  initialQueue: FaceMatchReviewItem[];
  namedPeople: Person[];
  onClose: () => void;
  onMerged: () => void;
}) {
  const [queue, setQueue] = useState<FaceMatchReviewItem[]>(initialQueue);
  const [busy, setBusy] = useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);

  const current = queue[0];
  const totalReview = initialQueue.length;
  const doneCount = totalReview - queue.length;

  useEffect(() => {
    setFullPreviewOpen(false);
  }, [current?.placeholderPersonId]);

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
      const trimmed = name.trim();
      if (!trimmed) {
        alert("Enter a name.");
        return;
      }
      setBusy(true);
      try {
        await updatePerson(current.placeholderPersonId, trimmed);
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

  const fullPreviewUrl =
    fullPreviewOpen && current ? faceMatchFullImageSrc(current) : null;

  return (
    <ModalRoot onBackdropClick={busy ? () => {} : onClose}>
      <ModalPanel
        className="match-faces-modal"
        onEscape={busy || fullPreviewOpen ? undefined : onClose}
        trapFocus={!fullPreviewOpen}
      >
        <ModalTitle id="match-faces-title">Match faces</ModalTitle>
        <ModalBody>
          {initialQueue.length === 0 ? (
            <p className="u-text-muted u-text-sm">
              No placeholder people to compare, or nothing met the review
              threshold.
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
              onOpenFullPreview={() => setFullPreviewOpen(true)}
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
      {fullPreviewUrl != null && current != null && (
        <FullscreenImage
          src={fullPreviewUrl}
          alt={`${current.placeholderName} — full image`}
          onClose={() => setFullPreviewOpen(false)}
        />
      )}
    </ModalRoot>
  );
}

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ModalActions,
  ModalBody,
  ModalPanel,
  ModalRoot,
  ModalTitle,
} from "@/components/ui/modal";
import { bulkAddMediaTags, bulkRemoveMediaTags } from "../api";
import { TagAddInput } from "./TagAddInput";

interface BulkTagsModalProps {
  mediaIds: string[];
  onClose: () => void;
  onChanged: () => void;
}

export function BulkTagsModal({
  mediaIds,
  onClose,
  onChanged,
}: BulkTagsModalProps) {
  const queryClient = useQueryClient();
  const [appliedTags, setAppliedTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyTag = useCallback(
    async (raw: string) => {
      const normalized = raw.trim().toLowerCase();
      if (!normalized || saving || appliedTags.includes(normalized)) return;
      setError(null);
      setSaving(true);
      try {
        const result = await bulkAddMediaTags(mediaIds, [normalized]);
        if (result.failed > 0) {
          setError(`Tagged ${result.succeeded}, failed ${result.failed}.`);
        }
        setAppliedTags((prev) =>
          [...prev, normalized].sort((a, b) => a.localeCompare(b)),
        );
        setTagDraft("");
        await queryClient.invalidateQueries({ queryKey: ["mediaTags"] });
        onChanged();
      } catch {
        setError("Failed to add tag.");
      } finally {
        setSaving(false);
      }
    },
    [appliedTags, mediaIds, onChanged, queryClient, saving],
  );

  const addDraftTag = useCallback(
    (raw?: string) => {
      void applyTag(raw ?? tagDraft);
    },
    [applyTag, tagDraft],
  );

  const removeTag = useCallback(
    async (tag: string) => {
      if (saving) return;
      setError(null);
      setSaving(true);
      try {
        const result = await bulkRemoveMediaTags(mediaIds, [tag]);
        if (result.failed > 0) {
          setError(
            `Removed from ${result.succeeded}, failed ${result.failed}.`,
          );
        }
        setAppliedTags((prev) => prev.filter((t) => t !== tag));
        await queryClient.invalidateQueries({ queryKey: ["mediaTags"] });
        onChanged();
      } catch {
        setError("Failed to remove tag.");
      } finally {
        setSaving(false);
      }
    },
    [mediaIds, onChanged, queryClient, saving],
  );

  return (
    <ModalRoot onBackdropClick={saving ? () => {} : onClose}>
      <ModalPanel
        onEscape={saving ? undefined : onClose}
        aria-labelledby="bulk-tags-title"
      >
        <ModalTitle id="bulk-tags-title">
          Add tags ({mediaIds.length} {mediaIds.length === 1 ? "file" : "files"}
          )
        </ModalTitle>
        <ModalBody>
          <p className="bulk-tags__hint">
            Tags save as you add them. Existing tags on each file are kept.
          </p>
          <div className="viewer-details__tags">
            {appliedTags.map((tag) => (
              <span key={tag} className="viewer-details__tag">
                #{tag}
                <button
                  type="button"
                  className="viewer-details__tag-remove"
                  onClick={() => {
                    void removeTag(tag);
                  }}
                  disabled={saving}
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="viewer-details__tag-add">
            <TagAddInput
              value={tagDraft}
              onChange={setTagDraft}
              onAdd={() => addDraftTag()}
              excludeTags={appliedTags}
              disabled={saving}
              saving={saving}
              suggestionsListId="bulk-tags-suggestions"
            />
          </div>
          {error && <p className="bulk-date__error">{error}</p>}
        </ModalBody>
        <ModalActions>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Done
          </Button>
        </ModalActions>
      </ModalPanel>
    </ModalRoot>
  );
}

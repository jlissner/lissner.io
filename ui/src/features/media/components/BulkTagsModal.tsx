import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ModalActions,
  ModalBody,
  ModalPanel,
  ModalRoot,
  ModalTitle,
} from "@/components/ui/modal";
import { bulkAddMediaTags, bulkRemoveMediaTags, listMediaTags } from "../api";
import { filterTagSuggestions } from "../lib/search-autocomplete";

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

  const tagsQuery = useQuery({
    queryKey: ["mediaTags"],
    queryFn: listMediaTags,
    staleTime: 60_000,
  });

  const suggestions = useMemo(() => {
    const existing = tagsQuery.data?.tags ?? [];
    const draft = tagDraft.trim().toLowerCase();
    if (!draft) return [];
    return filterTagSuggestions(existing, draft).filter(
      (tag) => !appliedTags.includes(tag),
    );
  }, [tagDraft, tagsQuery.data?.tags, appliedTags]);

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
            <input
              type="text"
              className="viewer-details__datetime-input"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDraftTag();
                }
              }}
              placeholder="Add tag (e.g. summer2025)"
              disabled={saving}
              aria-label="New tag"
              list="bulk-tags-suggestions"
            />
            <datalist id="bulk-tags-suggestions">
              {suggestions.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => addDraftTag()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Add"}
            </button>
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

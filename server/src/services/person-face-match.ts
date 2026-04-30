import * as db from "../db/media.js";
import { isEffectiveImageItem } from "../lib/effective-image.js";
import { getFaceSimilarityFn } from "../faces.js";
import type { FaceMatchReviewItem, FaceMatchRunResponse } from "@shared";
import {
  collectDescriptorsForPerson,
  isPlaceholderPersonName,
  mergeSuggestionsFromDescriptors,
} from "./person-merge-suggestions.js";

function getFirstImagePreviewForPerson(personId: number): {
  mediaId: string | null;
  previewFaceCrop: boolean;
} {
  const rows = db.getMediaForPerson(personId, 10);
  const first = rows.find((r) => isEffectiveImageItem(r));
  if (!first) return { mediaId: null, previewFaceCrop: false };
  const previewFaceCrop =
    first.x != null &&
    first.y != null &&
    first.width != null &&
    first.height != null &&
    first.width > 0 &&
    first.height > 0;
  return { mediaId: first.id, previewFaceCrop };
}

/**
 * Compare every `Person …` placeholder to every named person and return a review queue.
 * Merging into a named person always requires an explicit user action (no silent auto-merge).
 */
export async function runFaceMatchBatch(): Promise<FaceMatchRunResponse> {
  if (process.env.BDD_FACE_MATCH_STUB === "1") {
    const names = db.getPersonNames();
    const ids = db.getAllPersonIds();
    const ph = ids.find((id) => (names.get(id) ?? "").startsWith("Person"));
    const named = ids.find((id) => !(names.get(id) ?? "").startsWith("Person"));
    if (ph == null || named == null) {
      return { autoMerged: [], reviewQueue: [] };
    }
    return {
      autoMerged: [],
      reviewQueue: [
        {
          placeholderPersonId: ph,
          placeholderName: names.get(ph) ?? `Person ${ph}`,
          hasFaceDescriptors: true,
          topMatch: {
            personId: named,
            name: names.get(named) ?? `Person ${named}`,
            score: 0.99,
          },
          otherMatches: [],
          previewMediaId: null,
          previewFaceCrop: false,
        },
      ],
    };
  }

  const sim = await getFaceSimilarityFn();
  const names = db.getPersonNames();
  const allIds = db.getAllPersonIds();
  const placeholders = allIds.filter((id) => {
    const n = names.get(id) ?? `Person ${id}`;
    return isPlaceholderPersonName(n);
  });
  const namedIds = allIds.filter((id) => {
    const n = names.get(id) ?? `Person ${id}`;
    return !isPlaceholderPersonName(n);
  });

  const placeholderDescriptors = new Map<number, number[][]>();
  for (const id of placeholders) {
    placeholderDescriptors.set(id, await collectDescriptorsForPerson(id));
  }

  const namedDescriptors = new Map<number, number[][]>();
  for (const id of namedIds) {
    namedDescriptors.set(id, await collectDescriptorsForPerson(id));
  }

  const namedDescriptorsForReview = new Map(namedDescriptors);

  const reviewQueue: FaceMatchReviewItem[] = [];
  for (const id of placeholders.sort((a, b) => a - b)) {
    const src = placeholderDescriptors.get(id) ?? [];
    const placeholderName = names.get(id) ?? `Person ${id}`;
    const hasFaceDescriptors = src.length > 0;
    const suggestions = hasFaceDescriptors
      ? mergeSuggestionsFromDescriptors(
          src,
          namedIds,
          names,
          namedDescriptorsForReview,
          sim,
        )
      : [];
    const topMatch = suggestions[0] ?? null;
    const otherMatches = suggestions.slice(1);
    const preview = getFirstImagePreviewForPerson(id);
    reviewQueue.push({
      placeholderPersonId: id,
      placeholderName,
      hasFaceDescriptors,
      topMatch,
      otherMatches,
      previewMediaId: preview.mediaId,
      previewFaceCrop: preview.previewFaceCrop,
    });
  }

  reviewQueue.sort((a, b) => {
    const sa = a.topMatch?.score ?? 0;
    const sb = b.topMatch?.score ?? 0;
    if (sb !== sa) return sb - sa;
    return a.placeholderPersonId - b.placeholderPersonId;
  });

  return { autoMerged: [], reviewQueue };
}

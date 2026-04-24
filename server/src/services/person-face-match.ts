import * as db from "../db/media.js";
import { isEffectiveImageItem } from "../lib/effective-image.js";
import { getFaceSimilarityFn } from "../faces.js";
import { mergePeople } from "./people-service.js";
import type {
  FaceMatchAutoMerged,
  FaceMatchReviewItem,
  FaceMatchRunResponse,
} from "@shared";
import {
  collectDescriptorsForPerson,
  isPlaceholderPersonName,
  mergeSuggestionsFromDescriptors,
  type MergeSuggestion,
} from "./person-merge-suggestions.js";

/**
 * When similarity rounds to 100% in the UI (`Math.round(score * 100) === 100`),
 * treat as an automatic merge into that named person.
 */
const AUTO_MERGE_MATCH_SCORE = 0.995;

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
 * Compare every `Person …` placeholder to every named person, auto-merge near-identical
 * matches, then return a FIFO review queue for the rest.
 */
export async function runFaceMatchBatch(): Promise<FaceMatchRunResponse> {
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

  const analysesById = new Map<number, MergeSuggestion[]>();
  for (const id of placeholders) {
    const src = placeholderDescriptors.get(id) ?? [];
    analysesById.set(
      id,
      mergeSuggestionsFromDescriptors(
        src,
        namedIds,
        names,
        namedDescriptors,
        sim,
      ),
    );
  }

  const autoMerged: FaceMatchAutoMerged[] = [];
  const sortedPlaceholders = [...placeholders].sort((a, b) => a - b);
  for (const id of sortedPlaceholders) {
    const stillThere = db.getAllPersonIds().includes(id);
    if (!stillThere) continue;
    const suggestions = analysesById.get(id) ?? [];
    const top = suggestions[0];
    if (top && top.score >= AUTO_MERGE_MATCH_SCORE) {
      const result = mergePeople(id, top.personId);
      if (result.ok) {
        autoMerged.push({ merged: id, into: top.personId, intoName: top.name });
      }
    }
  }

  const namesAfter = db.getPersonNames();
  const allIdsAfter = db.getAllPersonIds();
  const remainingPlaceholders = allIdsAfter.filter((pid) => {
    const n = namesAfter.get(pid) ?? `Person ${pid}`;
    return isPlaceholderPersonName(n);
  });
  const namedIdsAfter = allIdsAfter.filter((pid) => {
    const n = namesAfter.get(pid) ?? `Person ${pid}`;
    return !isPlaceholderPersonName(n);
  });

  const namedDescriptorsAfter = new Map<number, number[][]>();
  for (const id of namedIdsAfter) {
    namedDescriptorsAfter.set(id, await collectDescriptorsForPerson(id));
  }

  const reviewQueue: FaceMatchReviewItem[] = [];
  for (const id of remainingPlaceholders) {
    const src = placeholderDescriptors.get(id) ?? [];
    const placeholderName = namesAfter.get(id) ?? `Person ${id}`;
    const hasFaceDescriptors = src.length > 0;
    const suggestions = hasFaceDescriptors
      ? mergeSuggestionsFromDescriptors(
          src,
          namedIdsAfter,
          namesAfter,
          namedDescriptorsAfter,
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

  return { autoMerged, reviewQueue };
}

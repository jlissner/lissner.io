import type {
  CreatePersonResponse,
  PersonMediaPreviewItem,
  PersonSummary,
  UpdatePersonResponse,
} from "../../../shared/src/api.js";
import * as db from "../db/media.js";
import type { ServiceFailure } from "./service-result.js";

export function getPersonMediaPreview(
  personId: number,
  limit: number,
): PersonMediaPreviewItem[] {
  const media = db.getMediaForPerson(personId, limit);
  return media.map((m) => ({
    id: m.id,
    filename: m.filename,
    originalName: m.originalName,
    mimeType: m.mimeType,
    size: m.size,
    uploadedAt: m.uploadedAt,
    dateTaken: m.dateTaken,
    latitude: m.latitude,
    longitude: m.longitude,
    backedUpAt: m.backedUpAt,
    motionCompanionId: m.motionCompanionId,
    x: m.x ?? null,
    y: m.y ?? null,
    width: m.width ?? null,
    height: m.height ?? null,
    indexed: m.indexed,
    backedUp: !!m.backedUpAt,
  }));
}

export function listPeopleSummary(): PersonSummary[] {
  const ids = db.getAllPersonIds();
  const names = db.getPersonNames();
  return ids.map((id) => ({
    id,
    name: names.get(id) ?? `Person ${id}`,
    photoCount: db.getMediaCountForPerson(id),
    representativeMediaId: db.getRepresentativeMediaId(id),
  }));
}

export function createPersonNamed(name: string): CreatePersonResponse {
  const id = db.createPerson(name.trim());
  return { id, name: name.trim() };
}

export type DeletePersonResult = { ok: true } | ServiceFailure<"not_found">;

export function deletePersonById(personId: number): DeletePersonResult {
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(personId)) {
    return { ok: false, reason: "not_found" };
  }
  db.deletePerson(personId);
  return { ok: true };
}

export type MergePeopleResult =
  | { ok: true; merged: number; into: number }
  | ServiceFailure<"invalid_ids" | "merge_into_self" | "not_found">;

export function mergePeople(
  mergeFromId: number,
  mergeIntoId: number,
): MergePeopleResult {
  if (
    isNaN(mergeFromId) ||
    mergeFromId < 1 ||
    isNaN(mergeIntoId) ||
    mergeIntoId < 1
  ) {
    return { ok: false, reason: "invalid_ids" };
  }
  if (mergeFromId === mergeIntoId) {
    return { ok: false, reason: "merge_into_self" };
  }
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(mergeFromId) || !allIds.includes(mergeIntoId)) {
    return { ok: false, reason: "not_found" };
  }
  db.mergePeople(mergeIntoId, mergeFromId);
  return { ok: true, merged: mergeFromId, into: mergeIntoId };
}

export function renamePerson(
  personId: number,
  name: string,
): UpdatePersonResponse {
  db.setPersonName(personId, name.trim());
  return { id: personId, name: name.trim() };
}

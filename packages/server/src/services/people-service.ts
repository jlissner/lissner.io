import {
  CreatePersonResponse,
  PersonMediaPreviewItem,
  PersonSummary,
  UpdatePersonResponse,
} from "@lissner/shared";
import * as db from "../db/media.js";
import type { ServiceFailure } from "./service-result.js";

export async function getPersonMediaPreview(
  personId: number,
  limit: number,
): Promise<PersonMediaPreviewItem[]> {
  const media = await db.getMediaForPerson(personId, limit);
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

export async function listPeopleSummary(): Promise<PersonSummary[]> {
  const ids = await db.getAllPersonIds();
  const names = await db.getPersonNames();
  return Promise.all(
    ids.map(async (id) => ({
      id,
      name: names.get(id) ?? `Person ${id}`,
      photoCount: await db.getMediaCountForPerson(id),
      representativeMediaId: await db.getRepresentativeMediaId(id),
    })),
  );
}

export async function createPersonNamed(
  name: string,
): Promise<CreatePersonResponse> {
  const id = await db.createPerson(name.trim());
  return { id, name: name.trim() };
}

type DeletePersonResult =
  | { ok: true }
  | ServiceFailure<"not_found" | "linked_to_user">;

export async function deletePersonById(
  personId: number,
): Promise<DeletePersonResult> {
  const allIds = await db.getAllPersonIds();
  if (!allIds.includes(personId)) {
    return { ok: false, reason: "not_found" };
  }
  const deleted = await db.deletePersonSafe(personId);
  if (!deleted.ok) return deleted;
  return { ok: true as const };
}

type MergePeopleResult =
  | { ok: true; merged: number; into: number }
  | ServiceFailure<"invalid_ids" | "merge_into_self" | "not_found">;

export async function mergePeople(
  mergeFromId: number,
  mergeIntoId: number,
): Promise<MergePeopleResult> {
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
  const allIds = await db.getAllPersonIds();
  if (!allIds.includes(mergeFromId) || !allIds.includes(mergeIntoId)) {
    return { ok: false, reason: "not_found" };
  }
  await db.mergePeople(mergeIntoId, mergeFromId);
  return { ok: true, merged: mergeFromId, into: mergeIntoId };
}

export async function renamePerson(
  personId: number,
  name: string,
): Promise<UpdatePersonResponse> {
  await db.setPersonName(personId, name.trim());
  return { id: personId, name: name.trim() };
}

export async function bulkDeleteUntaggedPlaceholders(): Promise<{
  deleted: number[];
}> {
  const ids = await db.getUntaggedPlaceholderPersonIds();
  await Promise.all(ids.map((id) => db.deletePersonSafe(id)));
  return { deleted: ids };
}

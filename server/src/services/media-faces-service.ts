import * as db from "../db/media.js";
import { isEffectiveImageItem } from "../lib/effective-image.js";

export type AddPersonToMediaTagResult =
  | { ok: true; personId: number; created: "new" | "existing" }
  | {
      ok: false;
      reason: "not_found" | "box_required" | "person_required" | "person_not_found";
    };

export function addPersonToMediaTag(params: {
  mediaId: string;
  personId: unknown;
  box: unknown;
  createNew: boolean;
}): AddPersonToMediaTagResult {
  const item = db.getMediaById(params.mediaId);
  if (!item || !isEffectiveImageItem(item)) {
    return { ok: false, reason: "not_found" };
  }
  const box = params.box;
  if (
    !box ||
    typeof box !== "object" ||
    typeof (box as { x?: unknown }).x !== "number" ||
    typeof (box as { y?: unknown }).y !== "number" ||
    typeof (box as { width?: unknown }).width !== "number" ||
    typeof (box as { height?: unknown }).height !== "number"
  ) {
    return { ok: false, reason: "box_required" };
  }
  const b = box as { x: number; y: number; width: number; height: number };
  if (params.createNew) {
    const targetPersonId = db.createNewPerson();
    db.addPersonToMedia(item.id, targetPersonId, b);
    return { ok: true, personId: targetPersonId, created: "new" };
  }
  const id = parseInt(String(params.personId ?? ""), 10);
  if (isNaN(id) || id < 1) {
    return { ok: false, reason: "person_required" };
  }
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(id)) {
    return { ok: false, reason: "person_not_found" };
  }
  db.addPersonToMedia(item.id, id, b);
  return { ok: true, personId: id, created: "existing" };
}

export function removePersonFromMediaTag(mediaId: string, personId: number) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (isNaN(personId) || personId < 1) {
    return { ok: false as const, reason: "bad_person" as const };
  }
  const removed = db.removePersonFromMedia(item.id, personId);
  if (!removed) {
    return { ok: false as const, reason: "not_tagged" as const };
  }
  return { ok: true as const };
}

export function reassignPersonInMediaTag(
  mediaId: string,
  fromPersonId: number,
  toPersonId: number
) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (
    isNaN(fromPersonId) ||
    fromPersonId < 1 ||
    isNaN(toPersonId) ||
    toPersonId < 1
  ) {
    return { ok: false as const, reason: "bad_ids" as const };
  }
  if (fromPersonId === toPersonId) {
    return { ok: false as const, reason: "same_person" as const };
  }
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(toPersonId)) {
    return { ok: false as const, reason: "target_missing" as const };
  }
  const ok = db.reassignPersonInMedia(item.id, fromPersonId, toPersonId);
  if (!ok) {
    return { ok: false as const, reason: "not_tagged" as const };
  }
  return { ok: true as const, body: { reassigned: fromPersonId, to: toPersonId } };
}

export function reassignToNewPerson(mediaId: string, fromPersonId: number) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (isNaN(fromPersonId) || fromPersonId < 1) {
    return { ok: false as const, reason: "bad_person" as const };
  }
  const newId = db.createNewPersonForMedia(item.id, fromPersonId);
  if (newId === null) {
    return { ok: false as const, reason: "not_tagged" as const };
  }
  return { ok: true as const, body: { newPersonId: newId } };
}

export function confirmFaceTag(mediaId: string, personId: number) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (isNaN(personId) || personId < 1) {
    return { ok: false as const, reason: "bad_person" as const };
  }
  const hasTag = db.getImagePeople(item.id).includes(personId);
  if (!hasTag) {
    return { ok: false as const, reason: "not_tagged" as const };
  }
  db.confirmFace(item.id, personId);
  return { ok: true as const };
}


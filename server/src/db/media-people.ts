import { db } from "./media-db.js";

const peopleStmts = {
  deleteAutoTagsForMedia: db.prepare(
    "DELETE FROM image_people WHERE media_id = ? AND COALESCE(source, 'auto') = 'auto'"
  ),
  insertIgnoreFace: db.prepare(
    "INSERT OR IGNORE INTO image_people (media_id, person_id, x, y, width, height, confidence, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ),
  getPersonName: db.prepare("SELECT name FROM person_names WHERE person_id = ?"),
  upsertPersonName: db.prepare(
    "INSERT INTO person_names (person_id, name) VALUES (?, ?) ON CONFLICT(person_id) DO UPDATE SET name = excluded.name"
  ),
  listPersonNames: db.prepare("SELECT person_id, name FROM person_names"),
  distinctPersonIdsFromTags: db.prepare("SELECT DISTINCT person_id FROM image_people"),
  personIdsFromNames: db.prepare("SELECT person_id FROM person_names"),
  selectTagsForPerson: db.prepare(
    "SELECT media_id, x, y, width, height FROM image_people WHERE person_id = ?"
  ),
  deleteImagePeopleByPerson: db.prepare("DELETE FROM image_people WHERE person_id = ?"),
  deletePersonNameByPerson: db.prepare("DELETE FROM person_names WHERE person_id = ?"),
  listPersonIdsForMedia: db.prepare(
    "SELECT person_id FROM image_people WHERE media_id = ? ORDER BY person_id"
  ),
  deleteTagPair: db.prepare("DELETE FROM image_people WHERE media_id = ? AND person_id = ?"),
  selectFaceDims: db.prepare(
    "SELECT x, y, width, height FROM image_people WHERE media_id = ? AND person_id = ?"
  ),
  replaceFace: db.prepare(
    "INSERT OR REPLACE INTO image_people (media_id, person_id, x, y, width, height, confidence, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ),
  nextPersonId: db.prepare(
    "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)"
  ),
  insertFaceManual: db.prepare(
    "INSERT INTO image_people (media_id, person_id, x, y, width, height, confidence, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ),
  insertPersonNameIgnore: db.prepare(
    "INSERT OR IGNORE INTO person_names (person_id, name) VALUES (?, ?)"
  ),
  insertPersonName: db.prepare("INSERT INTO person_names (person_id, name) VALUES (?, ?)"),
  confirmFace: db.prepare(
    "UPDATE image_people SET confidence = 1, source = 'manual' WHERE media_id = ? AND person_id = ?"
  ),
  listTaggedFaces: db.prepare(
    "SELECT person_id as personId, x, y, width, height, confidence FROM image_people WHERE media_id = ? AND x IS NOT NULL AND y IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL"
  ),
  getMediaForPerson: db.prepare(
    `SELECT m.id, m.filename, m.original_name as originalName, m.mime_type as mimeType, m.size, m.uploaded_at as uploadedAt, m.date_taken as dateTaken, m.latitude, m.longitude, m.backed_up_at as backedUpAt, m.motion_companion_id as motionCompanionId, m.hide_from_gallery as hideFromGallery, (SELECT 1 FROM embeddings e WHERE e.media_id = m.id LIMIT 1) as indexed, ip.x, ip.y, ip.width, ip.height
     FROM image_people ip
     JOIN media m ON m.id = ip.media_id
     WHERE ip.person_id = ? AND COALESCE(m.hide_from_gallery, 0) = 0
     ORDER BY m.uploaded_at DESC, m.filename ASC
     LIMIT ?`
  ),
};

/** Next ID = max(person_id across tags and names) + 1; call only inside an IMMEDIATE transaction. */
function allocNextPersonId(): number {
  const maxRow = peopleStmts.nextPersonId.get() as { m: number | null };
  return (maxRow?.m ?? 0) + 1;
}

const txnCreateNewPerson = db.transaction(() => {
  const newId = allocNextPersonId();
  peopleStmts.insertPersonNameIgnore.run(newId, `Person ${newId}`);
  return newId;
});

const txnCreateNamedPerson = db.transaction((name: string) => {
  const newId = allocNextPersonId();
  peopleStmts.insertPersonName.run(newId, name.trim());
  return newId;
});

const txnCreateNewPersonForMedia = db.transaction(
  (mediaId: string, fromPersonId: number): number | null => {
    const row = peopleStmts.selectFaceDims.get(mediaId, fromPersonId) as
      | { x: number | null; y: number | null; width: number | null; height: number | null }
      | undefined;
    if (!row) return null;
    const newId = allocNextPersonId();
    peopleStmts.deleteTagPair.run(mediaId, fromPersonId);
    peopleStmts.insertFaceManual.run(
      mediaId,
      newId,
      row.x,
      row.y,
      row.width,
      row.height,
      1,
      "manual"
    );
    peopleStmts.insertPersonNameIgnore.run(newId, `Person ${newId}`);
    return newId;
  }
);

export function setImagePeople(
  mediaId: string,
  entries: Array<{
    personId: number;
    box?: { x: number; y: number; width: number; height: number };
    confidence?: number;
  }>
) {
  // Re-indexing should only replace auto-detected tags; preserve manual edits.
  peopleStmts.deleteAutoTagsForMedia.run(mediaId);
  const seen = new Set<number>();
  for (const { personId, box, confidence } of entries) {
    if (seen.has(personId)) continue;
    seen.add(personId);
    peopleStmts.insertIgnoreFace.run(
      mediaId,
      personId,
      box?.x ?? null,
      box?.y ?? null,
      box?.width ?? null,
      box?.height ?? null,
      confidence ?? null,
      "auto"
    );
  }
}

export function getPersonName(personId: number): string | null {
  const row = peopleStmts.getPersonName.get(personId) as { name: string } | undefined;
  return row?.name ?? null;
}

export function setPersonName(personId: number, name: string) {
  peopleStmts.upsertPersonName.run(personId, name);
}

export function getPersonNames(): Map<number, string> {
  const rows = peopleStmts.listPersonNames.all() as Array<{
    person_id: number;
    name: string;
  }>;
  return new Map(rows.map((r) => [r.person_id, r.name]));
}

export function getAllPersonIds(): number[] {
  const fromImagePeople = peopleStmts.distinctPersonIdsFromTags.all() as Array<{
    person_id: number;
  }>;
  const fromNames = peopleStmts.personIdsFromNames.all() as Array<{
    person_id: number;
  }>;
  const ids = new Set([
    ...fromImagePeople.map((r) => r.person_id),
    ...fromNames.map((r) => r.person_id),
  ]);
  return [...ids].sort((a, b) => a - b);
}

export function mergePeople(keepId: number, mergeFromId: number): void {
  if (keepId === mergeFromId) return;
  const rows = peopleStmts.selectTagsForPerson.all(mergeFromId) as Array<{
    media_id: string;
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
  }>;
  for (const row of rows) {
    peopleStmts.insertIgnoreFace.run(
      row.media_id,
      keepId,
      row.x,
      row.y,
      row.width,
      row.height,
      1,
      "manual"
    );
  }
  peopleStmts.deleteImagePeopleByPerson.run(mergeFromId);
  peopleStmts.deletePersonNameByPerson.run(mergeFromId);
}

/** Delete a person entirely (all face tags and name). */
export function deletePerson(personId: number): void {
  peopleStmts.deleteImagePeopleByPerson.run(personId);
  peopleStmts.deletePersonNameByPerson.run(personId);
}

export function getImagePeople(mediaId: string): number[] {
  const rows = peopleStmts.listPersonIdsForMedia.all(mediaId) as Array<{ person_id: number }>;
  return rows.map((r) => r.person_id);
}

export function removePersonFromMedia(mediaId: string, personId: number): boolean {
  const result = peopleStmts.deleteTagPair.run(mediaId, personId);
  return result.changes > 0;
}

export function reassignPersonInMedia(
  mediaId: string,
  fromPersonId: number,
  toPersonId: number
): boolean {
  const row = peopleStmts.selectFaceDims.get(mediaId, fromPersonId) as
    | { x: number | null; y: number | null; width: number | null; height: number | null }
    | undefined;
  if (!row) return false;
  peopleStmts.deleteTagPair.run(mediaId, fromPersonId);
  peopleStmts.replaceFace.run(
    mediaId,
    toPersonId,
    row.x,
    row.y,
    row.width,
    row.height,
    1,
    "manual"
  );
  return true;
}

export function createNewPersonForMedia(mediaId: string, fromPersonId: number): number | null {
  return txnCreateNewPersonForMedia.immediate(mediaId, fromPersonId);
}

export function confirmFace(mediaId: string, personId: number): void {
  peopleStmts.confirmFace.run(mediaId, personId);
}

export function getTaggedFacesInMedia(mediaId: string): Array<{
  personId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number | null;
}> {
  return peopleStmts.listTaggedFaces.all(mediaId) as Array<{
    personId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence?: number | null;
  }>;
}

export function addPersonToMedia(
  mediaId: string,
  personId: number,
  box: { x: number; y: number; width: number; height: number },
  confidence?: number
): void {
  peopleStmts.insertFaceManual.run(
    mediaId,
    personId,
    box.x,
    box.y,
    box.width,
    box.height,
    confidence ?? 1,
    "manual"
  );
}

export function createNewPerson(): number {
  return txnCreateNewPerson.immediate();
}

/** Create a person with a name (no photo required). */
export function createPerson(name: string): number {
  return txnCreateNamedPerson.immediate(name);
}

export function getFaceBox(
  mediaId: string,
  personId: number
): { x: number; y: number; width: number; height: number } | null {
  const row = peopleStmts.selectFaceDims.get(mediaId, personId) as
    | { x: number; y: number; width: number; height: number }
    | undefined;
  if (!row || row.x == null || row.y == null || row.width == null || row.height == null) {
    return null;
  }
  return row;
}

export function getMediaForPerson(
  personId: number,
  limit: number
): Array<{
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dateTaken: string | null;
  latitude: number | null;
  longitude: number | null;
  backedUpAt: string | null;
  motionCompanionId: string | null;
  indexed: boolean;
  hideFromGallery: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}> {
  return peopleStmts.getMediaForPerson.all(personId, limit) as Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    dateTaken: string | null;
    latitude: number | null;
    longitude: number | null;
    backedUpAt: string | null;
    motionCompanionId: string | null;
    indexed: boolean;
    hideFromGallery: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }>;
}

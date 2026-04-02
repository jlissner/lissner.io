import { db } from "./media-db.js";

export function setImagePeople(
  mediaId: string,
  entries: Array<{
    personId: number;
    box?: { x: number; y: number; width: number; height: number };
    confidence?: number;
  }>
) {
  // Re-indexing should only replace auto-detected tags; preserve manual edits.
  db.prepare("DELETE FROM image_people WHERE media_id = ? AND COALESCE(source, 'auto') = 'auto'").run(
    mediaId
  );
  const seen = new Set<number>();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO image_people (media_id, person_id, x, y, width, height, confidence, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const { personId, box, confidence } of entries) {
    if (seen.has(personId)) continue;
    seen.add(personId);
    insert.run(
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
  const row = db.prepare("SELECT name FROM person_names WHERE person_id = ?").get(personId) as
    | { name: string }
    | undefined;
  return row?.name ?? null;
}

export function setPersonName(personId: number, name: string) {
  db.prepare(
    "INSERT INTO person_names (person_id, name) VALUES (?, ?) ON CONFLICT(person_id) DO UPDATE SET name = excluded.name"
  ).run(personId, name);
}

export function getPersonNames(): Map<number, string> {
  const rows = db.prepare("SELECT person_id, name FROM person_names").all() as Array<{
    person_id: number;
    name: string;
  }>;
  return new Map(rows.map((r) => [r.person_id, r.name]));
}

export function getAllPersonIds(): number[] {
  const fromImagePeople = db.prepare("SELECT DISTINCT person_id FROM image_people").all() as Array<{
    person_id: number;
  }>;
  const fromNames = db.prepare("SELECT person_id FROM person_names").all() as Array<{
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
  const rows = db
    .prepare("SELECT media_id, x, y, width, height FROM image_people WHERE person_id = ?")
    .all(mergeFromId) as Array<{
    media_id: string;
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
  }>;
  const insert = db.prepare(
    "INSERT OR IGNORE INTO image_people (media_id, person_id, x, y, width, height, confidence, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const row of rows) {
    insert.run(row.media_id, keepId, row.x, row.y, row.width, row.height, 1, "manual");
  }
  db.prepare("DELETE FROM image_people WHERE person_id = ?").run(mergeFromId);
  db.prepare("DELETE FROM person_names WHERE person_id = ?").run(mergeFromId);
}

/** Delete a person entirely (all face tags and name). */
export function deletePerson(personId: number): void {
  db.prepare("DELETE FROM image_people WHERE person_id = ?").run(personId);
  db.prepare("DELETE FROM person_names WHERE person_id = ?").run(personId);
}

export function getImagePeople(mediaId: string): number[] {
  const rows = db
    .prepare("SELECT person_id FROM image_people WHERE media_id = ? ORDER BY person_id")
    .all(mediaId) as Array<{ person_id: number }>;
  return rows.map((r) => r.person_id);
}

export function removePersonFromMedia(mediaId: string, personId: number): boolean {
  const result = db
    .prepare("DELETE FROM image_people WHERE media_id = ? AND person_id = ?")
    .run(mediaId, personId);
  return result.changes > 0;
}

export function reassignPersonInMedia(
  mediaId: string,
  fromPersonId: number,
  toPersonId: number
): boolean {
  const row = db
    .prepare("SELECT x, y, width, height FROM image_people WHERE media_id = ? AND person_id = ?")
    .get(mediaId, fromPersonId) as
    | { x: number | null; y: number | null; width: number | null; height: number | null }
    | undefined;
  if (!row) return false;
  db.prepare("DELETE FROM image_people WHERE media_id = ? AND person_id = ?").run(
    mediaId,
    fromPersonId
  );
  db.prepare(
    "INSERT OR REPLACE INTO image_people (media_id, person_id, x, y, width, height, confidence, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(mediaId, toPersonId, row.x, row.y, row.width, row.height, 1, "manual");
  return true;
}

export function createNewPersonForMedia(mediaId: string, fromPersonId: number): number | null {
  const row = db
    .prepare("SELECT x, y, width, height FROM image_people WHERE media_id = ? AND person_id = ?")
    .get(mediaId, fromPersonId) as
    | { x: number | null; y: number | null; width: number | null; height: number | null }
    | undefined;
  if (!row) return null;
  const maxRow = db
    .prepare(
      "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)"
    )
    .get() as { m: number | null };
  const newId = (maxRow?.m ?? 0) + 1;
  db.prepare("DELETE FROM image_people WHERE media_id = ? AND person_id = ?").run(
    mediaId,
    fromPersonId
  );
  db.prepare(
    "INSERT INTO image_people (media_id, person_id, x, y, width, height, confidence, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(mediaId, newId, row.x, row.y, row.width, row.height, 1, "manual");
  db.prepare("INSERT OR IGNORE INTO person_names (person_id, name) VALUES (?, ?)").run(
    newId,
    `Person ${newId}`
  );
  return newId;
}

export function confirmFace(mediaId: string, personId: number): void {
  db.prepare(
    "UPDATE image_people SET confidence = 1, source = 'manual' WHERE media_id = ? AND person_id = ?"
  ).run(mediaId, personId);
}

export function getTaggedFacesInMedia(mediaId: string): Array<{
  personId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number | null;
}> {
  const rows = db
    .prepare(
      "SELECT person_id as personId, x, y, width, height, confidence FROM image_people WHERE media_id = ? AND x IS NOT NULL AND y IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL"
    )
    .all(mediaId) as Array<{
    personId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence?: number | null;
  }>;
  return rows;
}

export function addPersonToMedia(
  mediaId: string,
  personId: number,
  box: { x: number; y: number; width: number; height: number },
  confidence?: number
): void {
  db.prepare(
    "INSERT INTO image_people (media_id, person_id, x, y, width, height, confidence, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(mediaId, personId, box.x, box.y, box.width, box.height, confidence ?? 1, "manual");
}

export function createNewPerson(): number {
  const maxRow = db
    .prepare(
      "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)"
    )
    .get() as { m: number | null };
  const newId = (maxRow?.m ?? 0) + 1;
  db.prepare("INSERT OR IGNORE INTO person_names (person_id, name) VALUES (?, ?)").run(
    newId,
    `Person ${newId}`
  );
  return newId;
}

/** Create a person with a name (no photo required). */
export function createPerson(name: string): number {
  const maxRow = db
    .prepare(
      "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)"
    )
    .get() as { m: number | null };
  const newId = (maxRow?.m ?? 0) + 1;
  db.prepare("INSERT INTO person_names (person_id, name) VALUES (?, ?)").run(newId, name.trim());
  return newId;
}

export function getFaceBox(
  mediaId: string,
  personId: number
): { x: number; y: number; width: number; height: number } | null {
  const row = db
    .prepare("SELECT x, y, width, height FROM image_people WHERE media_id = ? AND person_id = ?")
    .get(mediaId, personId) as { x: number; y: number; width: number; height: number } | undefined;
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
  originalName: string;
  mimeType: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  backedUpAt?: string | null;
}> {
  return db
    .prepare(
      `SELECT m.id, m.original_name as originalName, m.mime_type as mimeType, ip.x, ip.y, ip.width, ip.height, m.backed_up_at as backedUpAt
       FROM image_people ip
       JOIN media m ON m.id = ip.media_id
       WHERE ip.person_id = ? AND COALESCE(m.hide_from_gallery, 0) = 0
       ORDER BY m.uploaded_at DESC, m.filename ASC
       LIMIT ?`
    )
    .all(personId, limit) as Array<{
    id: string;
    originalName: string;
    mimeType: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    backedUpAt?: string | null;
  }>;
}

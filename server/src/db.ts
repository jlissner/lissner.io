import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../../../data/db/media.db");

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS embeddings (
    media_id TEXT PRIMARY KEY REFERENCES media(id),
    embedding TEXT NOT NULL,
    indexed_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS person_names (
    person_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS image_people (
    media_id TEXT NOT NULL,
    person_id INTEGER NOT NULL,
    PRIMARY KEY (media_id, person_id),
    FOREIGN KEY (media_id) REFERENCES media(id)
  )
`);

const imagePeopleCols = (db.prepare("PRAGMA table_info(image_people)").all() as Array<{ name: string }>).map((c) => c.name);
for (const col of ["x", "y", "width", "height"]) {
  if (!imagePeopleCols.includes(col)) {
    db.exec(`ALTER TABLE image_people ADD COLUMN ${col} REAL`);
  }
}

export function insertMedia(
  id: string,
  filename: string,
  originalName: string,
  mimeType: string,
  size: number
) {
  db.prepare(
    `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).run(id, filename, originalName, mimeType, size);
}

export function listMedia() {
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt
       FROM media ORDER BY uploaded_at DESC`
    )
    .all() as Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }>;
}

export function getMediaCount(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM media").get() as {
    count: number;
  };
  return row.count;
}

export function listMediaPaginated(limit: number, offset: number, personId?: number) {
  if (personId != null) {
    return db
      .prepare(
        `SELECT m.id, m.filename, m.original_name as originalName, m.mime_type as mimeType, m.size, m.uploaded_at as uploadedAt
         FROM media m
         JOIN image_people ip ON ip.media_id = m.id AND ip.person_id = ?
         ORDER BY m.uploaded_at DESC LIMIT ? OFFSET ?`
      )
      .all(personId, limit, offset) as Array<{
      id: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      uploadedAt: string;
    }>;
  }
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt
       FROM media ORDER BY uploaded_at DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }>;
}

export function getMediaCountForPerson(personId: number): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM image_people WHERE person_id = ?")
    .get(personId) as { count: number };
  return row.count;
}

export function getMediaById(id: string) {
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt
       FROM media WHERE id = ?`
    )
    .get(id) as
    | {
        id: string;
        filename: string;
        originalName: string;
        mimeType: string;
        size: number;
        uploadedAt: string;
      }
    | undefined;
}

export function upsertEmbedding(mediaId: string, embedding: number[]) {
  db.prepare(
    `INSERT INTO embeddings (media_id, embedding, indexed_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(media_id) DO UPDATE SET embedding = excluded.embedding, indexed_at = excluded.indexed_at`
  ).run(mediaId, JSON.stringify(embedding));
}

export function getEmbeddings() {
  return db
    .prepare(
      `SELECT media_id as mediaId, embedding, indexed_at as indexedAt FROM embeddings`
    )
    .all() as Array<{ mediaId: string; embedding: string; indexedAt: string }>;
}

export function getIndexedMediaIds(): Set<string> {
  const rows = db.prepare("SELECT media_id FROM embeddings").all() as Array<{
    media_id: string;
  }>;
  return new Set(rows.map((r) => r.media_id));
}

export function setImagePeople(
  mediaId: string,
  entries: Array<{ personId: number; box?: { x: number; y: number; width: number; height: number } }>
) {
  db.prepare("DELETE FROM image_people WHERE media_id = ?").run(mediaId);
  const insert = db.prepare(
    "INSERT INTO image_people (media_id, person_id, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const { personId, box } of entries) {
    insert.run(
      mediaId,
      personId,
      box?.x ?? null,
      box?.y ?? null,
      box?.width ?? null,
      box?.height ?? null
    );
  }
}

export function getPersonName(personId: number): string | null {
  const row = db
    .prepare("SELECT name FROM person_names WHERE person_id = ?")
    .get(personId) as { name: string } | undefined;
  return row?.name ?? null;
}

export function setPersonName(personId: number, name: string) {
  db.prepare(
    "INSERT INTO person_names (person_id, name) VALUES (?, ?) ON CONFLICT(person_id) DO UPDATE SET name = excluded.name"
  ).run(personId, name);
}

export function getPersonNames(): Map<number, string> {
  const rows = db
    .prepare("SELECT person_id, name FROM person_names")
    .all() as Array<{ person_id: number; name: string }>;
  return new Map(rows.map((r) => [r.person_id, r.name]));
}

export function getAllPersonIds(): number[] {
  const rows = db
    .prepare("SELECT DISTINCT person_id FROM image_people ORDER BY person_id")
    .all() as Array<{ person_id: number }>;
  return rows.map((r) => r.person_id);
}

export function mergePeople(keepId: number, mergeFromId: number): void {
  if (keepId === mergeFromId) return;
  const rows = db
    .prepare(
      "SELECT media_id, x, y, width, height FROM image_people WHERE person_id = ?"
    )
    .all(mergeFromId) as Array<{
    media_id: string;
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
  }>;
  const insert = db.prepare(
    "INSERT OR IGNORE INTO image_people (media_id, person_id, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const row of rows) {
    insert.run(
      row.media_id,
      keepId,
      row.x,
      row.y,
      row.width,
      row.height
    );
  }
  db.prepare("DELETE FROM image_people WHERE person_id = ?").run(mergeFromId);
  db.prepare("DELETE FROM person_names WHERE person_id = ?").run(mergeFromId);
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
    .get(mediaId, fromPersonId) as { x: number | null; y: number | null; width: number | null; height: number | null } | undefined;
  if (!row) return false;
  db.prepare("DELETE FROM image_people WHERE media_id = ? AND person_id = ?").run(mediaId, fromPersonId);
  db.prepare(
    "INSERT OR IGNORE INTO image_people (media_id, person_id, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(mediaId, toPersonId, row.x, row.y, row.width, row.height);
  return true;
}

export function createNewPersonForMedia(
  mediaId: string,
  fromPersonId: number
): number | null {
  const row = db
    .prepare("SELECT x, y, width, height FROM image_people WHERE media_id = ? AND person_id = ?")
    .get(mediaId, fromPersonId) as { x: number | null; y: number | null; width: number | null; height: number | null } | undefined;
  if (!row) return null;
  const maxRow = db.prepare(
    "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)"
  ).get() as { m: number | null };
  const newId = (maxRow?.m ?? 0) + 1;
  db.prepare("DELETE FROM image_people WHERE media_id = ? AND person_id = ?").run(mediaId, fromPersonId);
  db.prepare(
    "INSERT INTO image_people (media_id, person_id, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(mediaId, newId, row.x, row.y, row.width, row.height);
  db.prepare("INSERT OR IGNORE INTO person_names (person_id, name) VALUES (?, ?)").run(newId, `Person ${newId}`);
  return newId;
}

export function getTaggedFacesInMedia(mediaId: string): Array<{
  personId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const rows = db
    .prepare(
      "SELECT person_id as personId, x, y, width, height FROM image_people WHERE media_id = ? AND x IS NOT NULL AND y IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL"
    )
    .all(mediaId) as Array<{ personId: number; x: number; y: number; width: number; height: number }>;
  return rows;
}

export function addPersonToMedia(
  mediaId: string,
  personId: number,
  box: { x: number; y: number; width: number; height: number }
): void {
  db.prepare(
    "INSERT INTO image_people (media_id, person_id, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(mediaId, personId, box.x, box.y, box.width, box.height);
}

export function createNewPerson(): number {
  const maxRow = db.prepare(
    "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)"
  ).get() as { m: number | null };
  const newId = (maxRow?.m ?? 0) + 1;
  db.prepare("INSERT OR IGNORE INTO person_names (person_id, name) VALUES (?, ?)").run(newId, `Person ${newId}`);
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
): Array<{ id: string; mimeType: string; x?: number; y?: number; width?: number; height?: number }> {
  return db
    .prepare(
      `SELECT m.id, m.mime_type as mimeType, ip.x, ip.y, ip.width, ip.height
       FROM image_people ip
       JOIN media m ON m.id = ip.media_id
       WHERE ip.person_id = ?
       ORDER BY m.uploaded_at DESC
       LIMIT ?`
    )
    .all(personId, limit) as Array<{
    id: string;
    mimeType: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }>;
}

export function deleteMedia(id: string) {
  db.prepare("DELETE FROM embeddings WHERE media_id = ?").run(id);
  db.prepare("DELETE FROM media WHERE id = ?").run(id);
}

export function getMediaByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt
       FROM media WHERE id IN (${placeholders})`
    )
    .all(...ids) as Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }>;
}

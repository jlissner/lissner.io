import {
  execute,
  galleryVisibleSql,
  queryAll,
  queryOne,
  withTransaction,
} from "./client.js";

type Box = { x: number; y: number; width: number; height: number };
type NullableBox = { [K in keyof Box]: Box[K] | null };

const FACE_COLUMNS =
  "(media_id, person_id, x, y, width, height, confidence, source)";
const FACE_VALUES = "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

const INSERT_FACE_IGNORE = `INSERT INTO image_people ${FACE_COLUMNS} ${FACE_VALUES} ON CONFLICT (media_id, person_id) DO NOTHING`;
const INSERT_FACE = `INSERT INTO image_people ${FACE_COLUMNS} ${FACE_VALUES}`;
const REPLACE_FACE = `${INSERT_FACE} ON CONFLICT (media_id, person_id) DO UPDATE SET x = excluded.x, y = excluded.y, width = excluded.width, height = excluded.height, confidence = excluded.confidence, source = excluded.source`;

const sequence = <T>(
  items: readonly T[],
  fn: (item: T) => Promise<unknown>,
): Promise<void> =>
  items
    .reduce(
      (acc, item) => acc.then(() => fn(item)),
      Promise.resolve<unknown>(undefined),
    )
    .then(() => undefined);

const faceParams = (
  mediaId: string,
  personId: number,
  box: NullableBox,
  confidence: number | null,
  source: "auto" | "manual",
): unknown[] => [
  mediaId,
  personId,
  box.x,
  box.y,
  box.width,
  box.height,
  confidence,
  source,
];

const NO_BOX: NullableBox = { x: null, y: null, width: null, height: null };

/** No-op: statements are no longer cached. Kept for existing callers. */
export function resetMediaPeopleStatementCache(): void {}

/** Next ID = max(person_id across tags and names) + 1; call only inside a transaction. */
async function allocNextPersonId(): Promise<number> {
  const row = await queryOne<{ m: number | null }>(
    "SELECT MAX(person_id) AS m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names) AS ids",
  );
  return (row?.m ?? 0) + 1;
}

const insertPersonNameIgnore = (personId: number, name: string) =>
  execute(
    "INSERT INTO person_names (person_id, name) VALUES (?, ?) ON CONFLICT (person_id) DO NOTHING",
    [personId, name],
  );

const selectFaceDims = (mediaId: string, personId: number) =>
  queryOne<NullableBox>(
    "SELECT x, y, width, height FROM image_people WHERE media_id = ? AND person_id = ?",
    [mediaId, personId],
  );

const deleteTagPair = (mediaId: string, personId: number) =>
  execute("DELETE FROM image_people WHERE media_id = ? AND person_id = ?", [
    mediaId,
    personId,
  ]);

const uniqueByPersonId = <T extends { personId: number }>(
  entries: readonly T[],
): T[] =>
  entries.filter(
    (e, i) => entries.findIndex((o) => o.personId === e.personId) === i,
  );

export async function setImagePeople(
  mediaId: string,
  entries: Array<{
    personId: number;
    box?: Box;
    confidence?: number;
  }>,
): Promise<void> {
  // Re-indexing should only replace auto-detected tags; preserve manual edits.
  await execute(
    "DELETE FROM image_people WHERE media_id = ? AND COALESCE(source, 'auto') = 'auto'",
    [mediaId],
  );
  await sequence(uniqueByPersonId(entries), ({ personId, box, confidence }) =>
    execute(
      INSERT_FACE_IGNORE,
      faceParams(mediaId, personId, box ?? NO_BOX, confidence ?? null, "auto"),
    ),
  );
}

export async function getPersonName(personId: number): Promise<string | null> {
  const row = await queryOne<{ name: string }>(
    "SELECT name FROM person_names WHERE person_id = ?",
    [personId],
  );
  return row?.name ?? null;
}

export async function setPersonName(
  personId: number,
  name: string,
): Promise<void> {
  await execute(
    "INSERT INTO person_names (person_id, name) VALUES (?, ?) ON CONFLICT (person_id) DO UPDATE SET name = excluded.name",
    [personId, name],
  );
}

export async function getPersonNames(): Promise<Map<number, string>> {
  const rows = await queryAll<{ person_id: number; name: string }>(
    "SELECT person_id, name FROM person_names",
  );
  return new Map(rows.map((r) => [r.person_id, r.name]));
}

export async function getAllPersonIds(): Promise<number[]> {
  const fromImagePeople = await queryAll<{ person_id: number }>(
    "SELECT DISTINCT person_id FROM image_people",
  );
  const fromNames = await queryAll<{ person_id: number }>(
    "SELECT person_id FROM person_names",
  );
  const ids = new Set([
    ...fromImagePeople.map((r) => r.person_id),
    ...fromNames.map((r) => r.person_id),
  ]);
  return [...ids].sort((a, b) => a - b);
}

export async function mergePeople(
  keepId: number,
  mergeFromId: number,
): Promise<void> {
  if (keepId === mergeFromId) return;
  const rows = await queryAll<NullableBox & { media_id: string }>(
    "SELECT media_id, x, y, width, height FROM image_people WHERE person_id = ?",
    [mergeFromId],
  );
  await sequence(rows, (row) =>
    execute(
      INSERT_FACE_IGNORE,
      faceParams(row.media_id, keepId, row, 1, "manual"),
    ),
  );
  await execute("DELETE FROM image_people WHERE person_id = ?", [mergeFromId]);
  await execute("DELETE FROM person_names WHERE person_id = ?", [mergeFromId]);
}

type DeletePersonSafeResult = { ok: true };

const countByPersonId = async (
  table: "users" | "auth_whitelist",
  personId: number,
): Promise<number> => {
  const row = await queryOne<{ count: number | string }>(
    `SELECT COUNT(*) AS count FROM ${table} WHERE person_id = ?`,
    [personId],
  );
  return Number(row?.count ?? 0);
};

/**
 * Delete a person when safe.
 */
export const deletePersonSafe = (
  personId: number,
): Promise<DeletePersonSafeResult> =>
  withTransaction(async () => {
    const users = await countByPersonId("users", personId);
    const whitelist = await countByPersonId("auth_whitelist", personId);
    const isReferenced = users > 0 || whitelist > 0;

    await execute("DELETE FROM user_people WHERE person_id = ?", [personId]);
    await execute("DELETE FROM image_people WHERE person_id = ?", [personId]);
    if (!isReferenced) {
      await execute("DELETE FROM person_names WHERE person_id = ?", [personId]);
    }
    return { ok: true };
  });

export async function getImagePeople(mediaId: string): Promise<number[]> {
  const rows = await queryAll<{ person_id: number }>(
    "SELECT person_id FROM image_people WHERE media_id = ? ORDER BY person_id",
    [mediaId],
  );
  return rows.map((r) => r.person_id);
}

export async function removePersonFromMedia(
  mediaId: string,
  personId: number,
): Promise<boolean> {
  const result = await deleteTagPair(mediaId, personId);
  return result.changes > 0;
}

export async function reassignPersonInMedia(
  mediaId: string,
  fromPersonId: number,
  toPersonId: number,
): Promise<boolean> {
  const row = await selectFaceDims(mediaId, fromPersonId);
  if (!row) return false;
  await deleteTagPair(mediaId, fromPersonId);
  await execute(
    REPLACE_FACE,
    faceParams(mediaId, toPersonId, row, 1, "manual"),
  );
  return true;
}

export const createNewPersonForMedia = (
  mediaId: string,
  fromPersonId: number,
): Promise<number | null> =>
  withTransaction(async () => {
    const row = await selectFaceDims(mediaId, fromPersonId);
    if (!row) return null;
    const newId = await allocNextPersonId();
    await deleteTagPair(mediaId, fromPersonId);
    await execute(INSERT_FACE, faceParams(mediaId, newId, row, 1, "manual"));
    await insertPersonNameIgnore(newId, `Person ${newId}`);
    return newId;
  });

export async function confirmFace(
  mediaId: string,
  personId: number,
): Promise<void> {
  await execute(
    "UPDATE image_people SET confidence = 1, source = 'manual' WHERE media_id = ? AND person_id = ?",
    [mediaId, personId],
  );
}

export const getTaggedFacesInMedia = (
  mediaId: string,
): Promise<
  Array<
    Box & {
      personId: number;
      confidence?: number | null;
      source: "auto" | "manual";
    }
  >
> =>
  queryAll(
    `SELECT person_id AS "personId", x, y, width, height, confidence, COALESCE(source, 'auto') AS source FROM image_people WHERE media_id = ? AND x IS NOT NULL AND y IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL`,
    [mediaId],
  );

export async function addPersonToMedia(
  mediaId: string,
  personId: number,
  box: Box,
  confidence?: number,
): Promise<void> {
  await execute(
    INSERT_FACE,
    faceParams(mediaId, personId, box, confidence ?? 1, "manual"),
  );
}

export async function addPersonToMediaNoBox(
  mediaId: string,
  personId: number,
): Promise<void> {
  await execute(
    REPLACE_FACE,
    faceParams(mediaId, personId, NO_BOX, 1, "manual"),
  );
}

export const createNewPerson = (): Promise<number> =>
  withTransaction(async () => {
    const newId = await allocNextPersonId();
    await insertPersonNameIgnore(newId, `Person ${newId}`);
    return newId;
  });

/** Create a person with a name (no photo required). */
export const createPerson = (name: string): Promise<number> =>
  withTransaction(async () => {
    const newId = await allocNextPersonId();
    await execute("INSERT INTO person_names (person_id, name) VALUES (?, ?)", [
      newId,
      name.trim(),
    ]);
    return newId;
  });

const isCompleteBox = (row: NullableBox): row is Box =>
  row.x != null && row.y != null && row.width != null && row.height != null;

export async function getFaceBox(
  mediaId: string,
  personId: number,
): Promise<Box | null> {
  const row = await selectFaceDims(mediaId, personId);
  return row && isCompleteBox(row) ? row : null;
}

type MediaForPerson = {
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
};

export async function getMediaForPerson(
  personId: number,
  limit: number,
): Promise<MediaForPerson[]> {
  const rows = await queryAll<MediaForPerson>(
    `SELECT m.id, m.filename, m.original_name AS "originalName", m.mime_type AS "mimeType", m.size, m.uploaded_at AS "uploadedAt", m.date_taken AS "dateTaken", m.latitude, m.longitude, m.backed_up_at AS "backedUpAt", m.motion_companion_id AS "motionCompanionId", m.hide_from_gallery AS "hideFromGallery", (SELECT 1 FROM embeddings e WHERE e.media_id = m.id LIMIT 1) AS indexed, ip.x, ip.y, ip.width, ip.height
     FROM image_people ip
     JOIN media m ON m.id = ip.media_id
     WHERE ip.person_id = ? AND ${galleryVisibleSql()}
     ORDER BY m.uploaded_at DESC, m.filename ASC
     LIMIT ?`,
    [personId, limit],
  );
  return rows.map((r) => ({
    ...r,
    indexed: Boolean(r.indexed),
    hideFromGallery: Boolean(r.hideFromGallery),
  }));
}

export const listManualFaceRowsForMedia = (
  mediaId: string,
): Promise<
  Array<
    Box & {
      personId: number;
      confidence: number | null;
      source: string;
    }
  >
> =>
  queryAll(
    `SELECT person_id AS "personId", x, y, width, height, confidence, COALESCE(source, 'auto') AS source
     FROM image_people
     WHERE media_id = ? AND x IS NOT NULL AND y IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL
       AND COALESCE(source, 'auto') = 'manual'`,
    [mediaId],
  );

export async function updateFaceGeometryForMediaPerson(
  mediaId: string,
  personId: number,
  box: Box,
): Promise<void> {
  await execute(
    "UPDATE image_people SET x = ?, y = ?, width = ?, height = ? WHERE media_id = ? AND person_id = ?",
    [box.x, box.y, box.width, box.height, mediaId, personId],
  );
}

export async function getUntaggedPlaceholderPersonIds(): Promise<number[]> {
  const rows = await queryAll<{ person_id: number }>(
    `SELECT pn.person_id
     FROM person_names pn
     WHERE pn.name LIKE 'Person %'
       AND NOT EXISTS (SELECT 1 FROM image_people ip WHERE ip.person_id = pn.person_id)`,
  );
  return rows.map((r) => r.person_id);
}

export async function getRepresentativeMediaId(
  personId: number,
): Promise<string | null> {
  const row = await queryOne<{ mediaId: string }>(
    `SELECT ip.media_id AS "mediaId"
     FROM image_people ip
     JOIN media m ON m.id = ip.media_id
     WHERE ip.person_id = ?
       AND ip.x IS NOT NULL AND ip.width IS NOT NULL
       AND ${galleryVisibleSql()}
       AND m.mime_type LIKE 'image/%'
     ORDER BY ip.confidence DESC, m.uploaded_at DESC
     LIMIT 1`,
    [personId],
  );
  return row?.mediaId ?? null;
}

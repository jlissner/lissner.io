import { getDb } from "./media-db.js";

function buildStmts() {
  const db = getDb();
  return {
    listForMedia: db.prepare("SELECT tag FROM media_tags WHERE media_id = ? ORDER BY tag ASC"),
    deleteAllForMedia: db.prepare("DELETE FROM media_tags WHERE media_id = ?"),
    insertTag: db.prepare("INSERT OR IGNORE INTO media_tags (media_id, tag) VALUES (?, ?)"),
    listDistinct: db.prepare("SELECT DISTINCT tag FROM media_tags ORDER BY tag ASC"),
    idsForTag: db.prepare("SELECT media_id FROM media_tags WHERE tag = ? ORDER BY media_id ASC"),
  };
}

const state = { stmts: null as null | ReturnType<typeof buildStmts> };

function stmts() {
  if (state.stmts) return state.stmts;
  state.stmts = buildStmts();
  return state.stmts;
}

export function normalizeTagForStorage(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

export function listTagsForMedia(mediaId: string): string[] {
  const rows = stmts().listForMedia.all(mediaId) as Array<{ tag: string }>;
  return rows.map((r) => r.tag);
}

export function setTagsForMedia(mediaId: string, tags: string[]): void {
  const db = getDb();
  const normalized = [
    ...new Set(tags.map((t) => normalizeTagForStorage(t)).filter((t): t is string => t != null)),
  ];
  const tx = db.transaction(() => {
    stmts().deleteAllForMedia.run(mediaId);
    for (const tag of normalized) {
      stmts().insertTag.run(mediaId, tag);
    }
  });
  tx();
}

export function listDistinctTags(): string[] {
  const rows = stmts().listDistinct.all() as Array<{ tag: string }>;
  return rows.map((r) => r.tag);
}

export function getMediaIdsForTag(normalizedTag: string): string[] {
  const rows = stmts().idsForTag.all(normalizedTag) as Array<{ media_id: string }>;
  return rows.map((r) => r.media_id);
}

export function resetMediaTagsStatementCache(): void {
  state.stmts = null;
}

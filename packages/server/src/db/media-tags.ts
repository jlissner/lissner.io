import { execute, queryAll, withTransaction } from "./client.js";

const normalizeTagForStorage = (raw: string): string | null => {
  const t = raw.trim().toLowerCase();
  return t.length > 0 ? t : null;
};

const normalizeTags = (tags: string[]): string[] => [
  ...new Set(
    tags.map(normalizeTagForStorage).filter((t): t is string => t != null),
  ),
];

const runSequentially = (tasks: Array<() => Promise<unknown>>): Promise<void> =>
  tasks
    .reduce(
      (chain, task) => chain.then(task),
      Promise.resolve<unknown>(undefined),
    )
    .then(() => undefined);

const insertTag = (mediaId: string) => (tag: string) => (): Promise<unknown> =>
  execute(
    "INSERT INTO media_tags (media_id, tag) VALUES (?, ?) ON CONFLICT DO NOTHING",
    [mediaId, tag],
  );

const deleteTag = (mediaId: string) => (tag: string) => (): Promise<unknown> =>
  execute("DELETE FROM media_tags WHERE media_id = ? AND tag = ?", [
    mediaId,
    tag,
  ]);

export async function listTagsForMedia(mediaId: string): Promise<string[]> {
  const rows = await queryAll<{ tag: string }>(
    "SELECT tag FROM media_tags WHERE media_id = ? ORDER BY tag ASC",
    [mediaId],
  );
  return rows.map((r) => r.tag);
}

export async function setTagsForMedia(
  mediaId: string,
  tags: string[],
): Promise<void> {
  const normalized = normalizeTags(tags);
  await withTransaction(async () => {
    await execute("DELETE FROM media_tags WHERE media_id = ?", [mediaId]);
    await runSequentially(normalized.map(insertTag(mediaId)));
  });
}

export async function addTagsForMedia(
  mediaId: string,
  tags: string[],
): Promise<void> {
  const normalized = normalizeTags(tags);
  if (normalized.length === 0) return;
  await withTransaction(() =>
    runSequentially(normalized.map(insertTag(mediaId))),
  );
}

export async function removeTagsFromMedia(
  mediaId: string,
  tags: string[],
): Promise<void> {
  const normalized = normalizeTags(tags);
  if (normalized.length === 0) return;
  await withTransaction(() =>
    runSequentially(normalized.map(deleteTag(mediaId))),
  );
}

export async function listDistinctTags(): Promise<string[]> {
  const rows = await queryAll<{ tag: string }>(
    "SELECT DISTINCT tag FROM media_tags ORDER BY tag ASC",
  );
  return rows.map((r) => r.tag);
}

export async function getMediaIdsForTag(
  normalizedTag: string,
): Promise<string[]> {
  const rows = await queryAll<{ media_id: string }>(
    "SELECT media_id FROM media_tags WHERE tag = ? ORDER BY media_id ASC",
    [normalizedTag],
  );
  return rows.map((r) => r.media_id);
}

import { execute, queryAll, queryOne } from "./client.js";
import {
  findMediaByOriginalNameCaseInsensitive,
  getMediaById,
} from "./media-read.js";

/** No statement cache remains; kept so backup restore can still call it. */
export function resetMediaMotionStatementCache(): void {}

const isPixelMotionVideoBasename = (originalName: string): boolean => {
  const lower = originalName.toLowerCase();
  return lower.endsWith(".mp") && !lower.endsWith(".mp.jpg");
};

const getCompanionId = async (mediaId: string): Promise<string | null> => {
  const row = await queryOne<{ motion_companion_id: string | null }>(
    "SELECT motion_companion_id FROM media WHERE id = ?",
    [mediaId],
  );
  return row?.motion_companion_id ?? null;
};

const clearPair = (mediaId: string): Promise<unknown> =>
  execute(
    "UPDATE media SET motion_companion_id = NULL, hide_from_gallery = ? WHERE id = ?",
    [0, mediaId],
  );

const setCompanion = (
  mediaId: string,
  companionId: string,
  hidden: 0 | 1,
): Promise<unknown> =>
  execute(
    "UPDATE media SET motion_companion_id = ?, hide_from_gallery = ? WHERE id = ?",
    [companionId, hidden, mediaId],
  );

async function breakMotionPairForMedia(mediaId: string): Promise<void> {
  const cid = await getCompanionId(mediaId);
  if (!cid) return;
  await clearPair(mediaId);
  await clearPair(cid);
}

async function setMotionPair(stillId: string, videoId: string): Promise<void> {
  if (stillId === videoId) return;
  await breakMotionPairForMedia(stillId);
  await breakMotionPairForMedia(videoId);
  await setCompanion(stillId, videoId, 0);
  await setCompanion(videoId, stillId, 1);
}

/** Link `image.mp.jpg` ↔ `image.mp` so only the still appears in gallery grids. */
export async function linkMotionPairForMedia(mediaId: string): Promise<void> {
  const row = await getMediaById(mediaId);
  if (!row) return;
  const name = row.originalName;
  if (name.toLowerCase().endsWith(".mp.jpg")) {
    const video = await findMediaByOriginalNameCaseInsensitive(
      name.slice(0, -4),
    );
    return video &&
      video.id !== mediaId &&
      isPixelMotionVideoBasename(video.originalName)
      ? setMotionPair(mediaId, video.id)
      : breakMotionPairForMedia(mediaId);
  }
  if (isPixelMotionVideoBasename(name)) {
    const still = await findMediaByOriginalNameCaseInsensitive(`${name}.jpg`);
    return still && still.id !== mediaId
      ? setMotionPair(still.id, mediaId)
      : breakMotionPairForMedia(mediaId);
  }
  return breakMotionPairForMedia(mediaId);
}

/** Clear the other half of a motion pair before deleting a row (caller deletes `mediaId` after). */
export async function clearMotionPairForPeer(mediaId: string): Promise<void> {
  const cid = await getCompanionId(mediaId);
  if (!cid) return;
  await clearPair(cid);
}

/** Re-run pairing for every row (e.g. after restore). Idempotent. */
export async function relinkAllMotionPairs(): Promise<void> {
  const rows = await queryAll<{ id: string }>("SELECT id FROM media");
  await rows.reduce(
    (chain, { id }) => chain.then(() => linkMotionPairForMedia(id)),
    Promise.resolve(),
  );
}

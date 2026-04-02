import { db } from "./media-db.js";
import { findMediaByOriginalNameCaseInsensitive, getMediaById } from "./media-read.js";

function isPixelMotionVideoBasename(originalName: string): boolean {
  const lower = originalName.toLowerCase();
  return lower.endsWith(".mp") && !lower.endsWith(".mp.jpg");
}

function breakMotionPairForMedia(mediaId: string): void {
  const row = db
    .prepare(`SELECT motion_companion_id FROM media WHERE id = ?`)
    .get(mediaId) as { motion_companion_id: string | null } | undefined;
  const cid = row?.motion_companion_id;
  if (!cid) return;
  db.prepare(
    `UPDATE media SET motion_companion_id = NULL, hide_from_gallery = 0 WHERE id = ?`
  ).run(mediaId);
  db.prepare(
    `UPDATE media SET motion_companion_id = NULL, hide_from_gallery = 0 WHERE id = ?`
  ).run(cid);
}

/** Link `image.mp.jpg` ↔ `image.mp` so only the still appears in gallery grids. */
export function linkMotionPairForMedia(mediaId: string): void {
  const row = getMediaById(mediaId);
  if (!row) return;
  const name = row.originalName;
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp.jpg")) {
    const videoName = name.slice(0, -4);
    const video = findMediaByOriginalNameCaseInsensitive(videoName);
    if (video && video.id !== mediaId && isPixelMotionVideoBasename(video.originalName)) {
      setMotionPair(mediaId, video.id);
    } else {
      breakMotionPairForMedia(mediaId);
    }
  } else if (isPixelMotionVideoBasename(name)) {
    const stillName = `${name}.jpg`;
    const still = findMediaByOriginalNameCaseInsensitive(stillName);
    if (still && still.id !== mediaId) {
      setMotionPair(still.id, mediaId);
    } else {
      breakMotionPairForMedia(mediaId);
    }
  } else {
    breakMotionPairForMedia(mediaId);
  }
}

export function setMotionPair(stillId: string, videoId: string): void {
  if (stillId === videoId) return;
  breakMotionPairForMedia(stillId);
  breakMotionPairForMedia(videoId);
  db.prepare(
    `UPDATE media SET motion_companion_id = ?, hide_from_gallery = 0 WHERE id = ?`
  ).run(videoId, stillId);
  db.prepare(
    `UPDATE media SET motion_companion_id = ?, hide_from_gallery = 1 WHERE id = ?`
  ).run(stillId, videoId);
}

/** Clear the other half of a motion pair before deleting a row (caller deletes `mediaId` after). */
export function clearMotionPairForPeer(mediaId: string): void {
  const row = db
    .prepare(`SELECT motion_companion_id FROM media WHERE id = ?`)
    .get(mediaId) as { motion_companion_id: string | null } | undefined;
  const cid = row?.motion_companion_id;
  if (!cid) return;
  db.prepare(
    `UPDATE media SET motion_companion_id = NULL, hide_from_gallery = 0 WHERE id = ?`
  ).run(cid);
}

/** Re-run pairing for every row (e.g. after restore). Idempotent. */
export function relinkAllMotionPairs(): void {
  const rows = db.prepare("SELECT id FROM media").all() as Array<{ id: string }>;
  for (const { id } of rows) {
    linkMotionPairForMedia(id);
  }
}

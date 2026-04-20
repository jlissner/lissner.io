import { getDb } from "./media-db.js";
import { findMediaByOriginalNameCaseInsensitive, getMediaById } from "./media-read.js";

function buildMotionStmts() {
  const db = getDb();
  return {
    selectCompanionId: db.prepare(`SELECT motion_companion_id FROM media WHERE id = ?`),
    clearPair: db.prepare(
      `UPDATE media SET motion_companion_id = NULL, hide_from_gallery = 0 WHERE id = ?`
    ),
    setCompanionStill: db.prepare(
      `UPDATE media SET motion_companion_id = ?, hide_from_gallery = 0 WHERE id = ?`
    ),
    setCompanionVideo: db.prepare(
      `UPDATE media SET motion_companion_id = ?, hide_from_gallery = 1 WHERE id = ?`
    ),
    listAllMediaIds: db.prepare("SELECT id FROM media"),
  };
}

const motionState = { stmts: null as null | ReturnType<typeof buildMotionStmts> };

export function resetMediaMotionStatementCache(): void {
  motionState.stmts = null;
}

function motionStmts() {
  if (motionState.stmts) return motionState.stmts;
  const stmts = buildMotionStmts();
  motionState.stmts = stmts;
  return stmts;
}

function isPixelMotionVideoBasename(originalName: string): boolean {
  const lower = originalName.toLowerCase();
  return lower.endsWith(".mp") && !lower.endsWith(".mp.jpg");
}

function breakMotionPairForMedia(mediaId: string): void {
  const row = motionStmts().selectCompanionId.get(mediaId) as
    | { motion_companion_id: string | null }
    | undefined;
  const cid = row?.motion_companion_id;
  if (!cid) return;
  motionStmts().clearPair.run(mediaId);
  motionStmts().clearPair.run(cid);
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
  motionStmts().setCompanionStill.run(videoId, stillId);
  motionStmts().setCompanionVideo.run(stillId, videoId);
}

/** Clear the other half of a motion pair before deleting a row (caller deletes `mediaId` after). */
export function clearMotionPairForPeer(mediaId: string): void {
  const row = motionStmts().selectCompanionId.get(mediaId) as
    | { motion_companion_id: string | null }
    | undefined;
  const cid = row?.motion_companion_id;
  if (!cid) return;
  motionStmts().clearPair.run(cid);
}

/** Re-run pairing for every row (e.g. after restore). Idempotent. */
export function relinkAllMotionPairs(): void {
  const rows = motionStmts().listAllMediaIds.all() as Array<{ id: string }>;
  for (const { id } of rows) {
    linkMotionPairForMedia(id);
  }
}

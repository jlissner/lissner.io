import path from "path";
import * as db from "../db/media.js";
import { mediaDir } from "../config/paths.js";
import { extractFacesFromImage, getFaceSimilarityFn, type FaceInImage } from "../faces.js";
import { ensureLocalMediaFile } from "./media-service.js";
import { isEffectiveImageItem } from "../lib/effective-image.js";

/** Auto-generated names like `Person 12` — compare to named people for merge hints. */
export function isPlaceholderPersonName(name: string): boolean {
  return name.trim().startsWith("Person");
}

function boxIoU(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - inter;
  return union <= 0 ? 0 : inter / union;
}

function pickMatchingFace(
  faces: FaceInImage[],
  storedBox: { x: number; y: number; width: number; height: number } | undefined
): FaceInImage | null {
  if (faces.length === 0) return null;
  if (!storedBox || storedBox.width <= 0 || storedBox.height <= 0) {
    return faces.length === 1 ? faces[0]! : null;
  }
  const sb = storedBox;
  const picked = faces.reduce(
    (acc, f) => {
      if (!f.box) return acc;
      const iou = boxIoU(sb, f.box);
      return iou > acc.bestIou ? { best: f, bestIou: iou } : acc;
    },
    { best: null as FaceInImage | null, bestIou: 0 }
  );
  return picked.bestIou >= 0.1 && picked.best ? picked.best : null;
}

const SAMPLE_IMAGE_LIMIT = 14;
const MAX_DESCRIPTORS = 12;
const MIN_SUGGESTION_SIMILARITY = 0.42;
const MAX_SUGGESTIONS = 12;

export async function collectDescriptorsForPerson(personId: number): Promise<number[][]> {
  const rows = db.getMediaForPerson(personId, SAMPLE_IMAGE_LIMIT);
  const descriptors: number[][] = [];
  for (const row of rows) {
    if (!isEffectiveImageItem(row)) continue;
    if (descriptors.length >= MAX_DESCRIPTORS) break;
    const item = db.getMediaById(row.id);
    if (!item) continue;
    const ok = await ensureLocalMediaFile(item);
    if (!ok) continue;
    const filePath = path.join(mediaDir, item.filename);
    const faces = await extractFacesFromImage(filePath, row.id);
    const storedBox =
      row.x != null && row.y != null && row.width != null && row.height != null && row.width > 0
        ? { x: row.x, y: row.y, width: row.width, height: row.height }
        : undefined;
    const match = pickMatchingFace(faces, storedBox);
    if (match?.descriptor) descriptors.push(match.descriptor);
  }
  return descriptors;
}

export function maxPairwiseSimilarity(
  a: number[][],
  b: number[][],
  sim: (x: number[], y: number[]) => number
): number {
  return a.reduce(
    (mx, da) =>
      Math.max(
        mx,
        b.reduce((m2, db) => Math.max(m2, sim(da, db)), 0)
      ),
    0
  );
}

export type MergeSuggestion = { personId: number; name: string; score: number };

/**
 * Compare precomputed source descriptors to cached named descriptors (batch face match).
 */
export function mergeSuggestionsFromDescriptors(
  sourceDescriptors: number[][],
  namedIds: number[],
  names: Map<number, string>,
  namedDescriptors: Map<number, number[][]>,
  sim: (a: number[], b: number[]) => number
): MergeSuggestion[] {
  if (sourceDescriptors.length === 0) {
    return [];
  }
  const out: MergeSuggestion[] = [];
  for (const pid of namedIds) {
    const candDescriptors = namedDescriptors.get(pid);
    if (!candDescriptors || candDescriptors.length === 0) continue;
    const score = maxPairwiseSimilarity(sourceDescriptors, candDescriptors, sim);
    if (score >= MIN_SUGGESTION_SIMILARITY) {
      out.push({
        personId: pid,
        name: names.get(pid) ?? `Person ${pid}`,
        score,
      });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, MAX_SUGGESTIONS);
}

/**
 * For a person with a placeholder name (`Person …`), re-detect faces and compare embeddings
 * to every **named** person. Returns likely duplicates sorted by score.
 */
export async function getMergeSuggestionsForPerson(
  sourcePersonId: number
): Promise<MergeSuggestion[]> {
  const name = db.getPersonName(sourcePersonId);
  const displayName = name ?? `Person ${sourcePersonId}`;
  if (!isPlaceholderPersonName(displayName)) {
    return [];
  }
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(sourcePersonId)) {
    return [];
  }

  const sourceDescriptors = await collectDescriptorsForPerson(sourcePersonId);
  if (sourceDescriptors.length === 0) {
    return [];
  }

  const sim = await getFaceSimilarityFn();
  const names = db.getPersonNames();
  const namedIds = allIds.filter((pid) => {
    if (pid === sourcePersonId) return false;
    const n = names.get(pid) ?? `Person ${pid}`;
    return !isPlaceholderPersonName(n);
  });
  const namedDescriptors = new Map<number, number[][]>();
  for (const pid of namedIds) {
    namedDescriptors.set(pid, await collectDescriptorsForPerson(pid));
  }
  return mergeSuggestionsFromDescriptors(sourceDescriptors, namedIds, names, namedDescriptors, sim);
}

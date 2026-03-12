import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import * as db from "./db.js";
import { getEmbedding } from "./embeddings.js";
import { describeImage } from "./vision.js";
import {
  extractFacesFromImage,
  clusterAllFaces,
  type FaceInImage,
} from "./faces.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, "../../../data/media");

const TEXT_MIMES = new Set([
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  "text/markdown",
  "text/csv",
]);

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

function formatPersonLabel(personId: number): string {
  const name = db.getPersonName(personId);
  return name ?? `Person ${personId}`;
}

async function getTextForItem(
  item: MediaItem,
  imagePersonIds?: Map<string, number[]>
): Promise<string> {
  if (TEXT_MIMES.has(item.mimeType)) {
    const filePath = path.join(mediaDir, item.filename);
    return readFile(filePath, "utf-8");
  }
  if (item.mimeType.startsWith("image/")) {
    try {
      const filePath = path.join(mediaDir, item.filename);
      const description = await describeImage(filePath);
      let text = `Image: ${item.originalName}. ${description || ""}`;
      const personIds = imagePersonIds?.get(item.id);
      if (personIds?.length) {
        const labels = personIds.map(formatPersonLabel);
        text += ` People in photo: ${labels.join(", ")}.`;
      }
      return text.trim();
    } catch (err) {
      console.error(`Image description failed for ${item.originalName}:`, err);
      return `Image: ${item.originalName}`;
    }
  }
  return item.originalName;
}

export async function indexMediaItem(item: MediaItem): Promise<boolean> {
  const text = await getTextForItem(item);
  if (!text.trim()) return false;
  const embedding = await getEmbedding(text.slice(0, 8000));
  db.upsertEmbedding(item.id, embedding);
  return true;
}

export async function indexMediaItems(
  items: MediaItem[],
  options: { skipIndexed?: boolean } = {}
): Promise<{ indexed: number; skipped: number }> {
  const skipIndexed = options.skipIndexed ?? true;
  const indexedIds = skipIndexed ? db.getIndexedMediaIds() : new Set<string>();

  const toIndex = items.filter((i) => !skipIndexed || !indexedIds.has(i.id));
  const imageItems = toIndex.filter((i) => i.mimeType.startsWith("image/"));

  let imagePersonIds = new Map<string, number[]>();
  const imagePersonEntries = new Map<string, Array<{ personId: number; box?: { x: number; y: number; width: number; height: number } }>>();

  if (imageItems.length > 0) {
    const allFaces: FaceInImage[] = [];
    for (const item of imageItems) {
      try {
        const filePath = path.join(mediaDir, item.filename);
        const faces = await extractFacesFromImage(filePath, item.id);
        allFaces.push(...faces);
      } catch (err) {
        console.error(`Face extraction failed for ${item.originalName}:`, err);
      }
    }
    if (allFaces.length > 0) {
      const entriesMap = clusterAllFaces(allFaces);
      for (const [mediaId, entries] of entriesMap) {
        db.setImagePeople(mediaId, entries);
        imagePersonEntries.set(mediaId, entries);
        imagePersonIds.set(mediaId, entries.map((e) => e.personId));
      }
    }
  }

  let indexed = 0;

  for (const item of toIndex) {
    try {
      const text = await getTextForItem(item, imagePersonIds);
      if (!text.trim()) continue;
      const embedding = await getEmbedding(text.slice(0, 8000));
      db.upsertEmbedding(item.id, embedding);
      indexed++;
    } catch (err) {
      console.error(`Failed to index ${item.originalName}:`, err);
    }
  }

  const skipped = items.length - indexed;
  return { indexed, skipped };
}

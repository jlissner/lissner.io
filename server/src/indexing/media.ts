import { existsSync } from "node:fs";
import { readFile } from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import exifr from "exifr";

import * as db from "../db/media.js";
import { getEmbedding } from "../embeddings.js";
import {
  beginBackgroundIndex,
  endBackgroundIndex,
  isBulkIndexJobRunning,
  setIndexProgress,
} from "./job-store.js";
import { describeImage } from "../vision.js";
import {
  extractFacesFromImage,
  clusterAllFaces,
  type FaceInImage,
  type ImagePersonEntry,
} from "../faces.js";
import { mediaDir } from "../config/paths.js";
import { isEffectiveImageItem } from "../lib/effective-image.js";
import { isTextMime, isVideoMime } from "../lib/media-mime.js";
import { computeAndStoreHash } from "../services/duplicate-detection.js";

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
  imagePersonIds?: Map<string, number[]>,
): Promise<string> {
  if (isTextMime(item.mimeType)) {
    const filePath = path.join(mediaDir, item.filename);
    return readFile(filePath, "utf-8");
  }
  if (isEffectiveImageItem(item)) {
    try {
      const filePath = path.join(mediaDir, item.filename);
      const description = await describeImage(filePath);
      const base = `Image: ${item.originalName}. ${description || ""}`;
      const personIds = imagePersonIds?.get(item.id);
      const suffix =
        personIds?.length && personIds.length > 0
          ? ` People in photo: ${personIds.map(formatPersonLabel).join(", ")}.`
          : "";
      return `${base}${suffix}`.trim();
    } catch (err) {
      console.warn(
        { err, originalName: item.originalName },
        "Image description failed (vision API error)",
      );
      return `Image: ${item.originalName}`;
    }
  }
  return item.originalName;
}

interface ExifData {
  dateTaken: string | null;
  latitude: number | null;
  longitude: number | null;
}

async function extractExifData(filePath: string): Promise<ExifData> {
  try {
    const tags = await exifr.parse(filePath, {
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "ModifyDate",
        "latitude",
        "longitude",
      ],
    });
    const date = tags?.DateTimeOriginal ?? tags?.CreateDate ?? tags?.ModifyDate;
    const dateTaken =
      date instanceof Date
        ? date.toISOString()
        : typeof date === "string"
          ? new Date(date).toISOString()
          : null;
    const lat = typeof tags?.latitude === "number" ? tags.latitude : null;
    const lng = typeof tags?.longitude === "number" ? tags.longitude : null;
    return { dateTaken, latitude: lat, longitude: lng };
  } catch {
    return { dateTaken: null, latitude: null, longitude: null };
  }
}

/**
 * `clusterAllFaces` assigns local cluster ids (1..n). For upload-time indexing we map each
 * cluster to a new `person_id` via `createNewPerson()` so we never collide with existing people.
 */
function remapClusterPersonIdsToNewDbPeople(
  entriesMap: Map<string, ImagePersonEntry[]>,
): Map<string, ImagePersonEntry[]> {
  const localIds = new Set<number>();
  for (const entries of entriesMap.values()) {
    for (const e of entries) localIds.add(e.personId);
  }
  const sorted = [...localIds].sort((a, b) => a - b);
  const localToGlobal = new Map<number, number>();
  for (const localId of sorted) {
    localToGlobal.set(localId, db.createNewPerson());
  }
  const out = new Map<string, ImagePersonEntry[]>();
  for (const [mediaId, entries] of entriesMap) {
    out.set(
      mediaId,
      entries.map((e) => ({
        ...e,
        personId: localToGlobal.get(e.personId)!,
      })),
    );
  }
  return out;
}

const FFPROBE_NOT_FOUND =
  "ffprobe not found. Install ffmpeg to extract video metadata (e.g. apt install ffmpeg).";

function execFileCapture(
  command: string,
  args: readonly string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      [...args],
      { maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const toStr = (chunk: string | Buffer | undefined): string => {
          if (chunk == null) return "";
          return typeof chunk === "string" ? chunk : chunk.toString("utf8");
        };
        const out = toStr(stdout);
        const errStr = toStr(stderr);
        if (err) {
          const ne = err as NodeJS.ErrnoException;
          if (ne.code === "ENOENT") {
            reject(err);
            return;
          }
          const withCode = err as NodeJS.ErrnoException & { status?: number };
          const exitCode =
            typeof withCode.code === "number"
              ? withCode.code
              : typeof withCode.status === "number"
                ? withCode.status
                : 1;
          resolve({ code: exitCode, stdout: out, stderr: errStr });
          return;
        }
        resolve({ code: 0, stdout: out, stderr: errStr });
      },
    );
  });
}

function ffprobeArgs(
  filePath: string,
  probesize: string,
  analyzeduration: string,
): string[] {
  return [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    "-probesize",
    probesize,
    "-analyzeduration",
    analyzeduration,
    filePath,
  ];
}

async function runFfprobeJson(filePath: string): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  const quick = await execFileCapture("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  if (quick.code === 0) return quick;
  const deep = await execFileCapture(
    "ffprobe",
    ffprobeArgs(filePath, "100000000", "500000000"),
  );
  return deep;
}

function truncateFileIssueDetail(message: string): string {
  const max = 480;
  return message.length <= max ? message : `${message.slice(0, max)}…`;
}

function stderrLooksLikeMissingPath(stderr: string): boolean {
  return /\bno such file or directory\b/i.test(stderr);
}

async function extractVideoMetadata(
  filePath: string,
  ctx?: { mediaId?: string; originalName?: string },
): Promise<{ dateTaken: string | null }> {
  const recordIssue = (code: string, detail: string): void => {
    if (ctx?.mediaId) {
      db.setMediaFileIssue(ctx.mediaId, code, truncateFileIssueDetail(detail));
    }
  };
  const clearIssue = (): void => {
    if (ctx?.mediaId) {
      db.clearMediaFileIssue(ctx.mediaId);
    }
  };

  if (!existsSync(filePath)) {
    recordIssue(
      "file_missing",
      `Media file not found on disk (wrong path, not synced yet, or removed): ${filePath}`,
    );
    console.warn("Video date skipped — media file not on disk", {
      filePath,
      originalName: ctx?.originalName,
    });
    return { dateTaken: null };
  }

  const probe = await runFfprobeJson(filePath).catch((err: unknown) => {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      throw new Error(FFPROBE_NOT_FOUND, { cause: err });
    }
    throw err;
  });
  const { code: exitCode, stdout, stderr } = probe;

  if (exitCode !== 0) {
    const fileStillMissing =
      !existsSync(filePath) || stderrLooksLikeMissingPath(stderr);
    const issueCode = fileStillMissing ? "file_missing" : "ffprobe_failed";
    const detail = [
      `ffprobe exited ${exitCode}`,
      stderr.trim() !== "" ? `stderr: ${stderr.trim().slice(0, 400)}` : null,
      `stdout: ${stdout.trim().slice(0, 200)}`,
    ]
      .filter(Boolean)
      .join(" · ");
    recordIssue(issueCode, detail);
    const logMessage = fileStillMissing
      ? "Video date skipped — file missing on disk (see Admin → File issues)"
      : "ffprobe could not read video (date skipped); flagged for admin review";
    console.warn(logMessage, {
      filePath,
      originalName: ctx?.originalName,
      exitCode,
      stderrPreview: stderr.trim().slice(0, 240),
    });
    return { dateTaken: null };
  }

  let data: {
    format?: { tags?: { creation_time?: string } };
    streams?: Array<{ tags?: { creation_time?: string } }>;
  };
  try {
    data = JSON.parse(stdout) as {
      format?: { tags?: { creation_time?: string } };
      streams?: Array<{ tags?: { creation_time?: string } }>;
    };
  } catch (err) {
    const parseMsg = err instanceof Error ? err.message : String(err);
    recordIssue(
      "ffprobe_bad_response",
      `JSON parse error: ${parseMsg}; stdout: ${stdout.slice(0, 200)}`,
    );
    return { dateTaken: null };
  }
  clearIssue();
  const formatDate = data.format?.tags?.creation_time;
  const streamDate = data.streams?.[0]?.tags?.creation_time;
  const dateStr = formatDate ?? streamDate;
  if (!dateStr) return { dateTaken: null };
  const d = new Date(dateStr);
  return { dateTaken: isNaN(d.getTime()) ? null : d.toISOString() };
}

export async function indexMediaItem(item: MediaItem): Promise<boolean> {
  const trackBackground = !isBulkIndexJobRunning();
  if (trackBackground) beginBackgroundIndex();
  try {
    try {
      const filePath = path.join(mediaDir, item.filename);
      const imagePersonIds = new Map<string, number[]>();
      if (isEffectiveImageItem(item)) {
        try {
          const [exif, faces] = await Promise.all([
            extractExifData(filePath),
            extractFacesFromImage(filePath, item.id).catch((err: unknown) => {
              console.error(
                { err, originalName: item.originalName },
                "Face extraction failed",
              );
              return [] as FaceInImage[];
            }),
          ]);
          if (exif.dateTaken) db.setMediaDateTaken(item.id, exif.dateTaken);
          if (exif.latitude != null && exif.longitude != null) {
            db.setMediaLocation(item.id, exif.latitude, exif.longitude);
          }
          if (faces.length > 0) {
            const entriesMap = await clusterAllFaces(faces);
            const remapped = remapClusterPersonIdsToNewDbPeople(entriesMap);
            const entriesForItem = remapped.get(item.id) ?? [];
            db.setImagePeople(item.id, entriesForItem);
            imagePersonIds.set(
              item.id,
              entriesForItem.map((e) => e.personId),
            );
          }
        } catch (err) {
          console.error(
            { err, originalName: item.originalName },
            "Image indexing prep failed",
          );
        }
      } else if (isVideoMime(item.mimeType)) {
        const meta = await extractVideoMetadata(filePath, {
          mediaId: item.id,
          originalName: item.originalName,
        });
        if (meta.dateTaken) db.setMediaDateTaken(item.id, meta.dateTaken);
      }
      const text = await getTextForItem(item, imagePersonIds);
      if (!text.trim()) return false;
      const embedding = await getEmbedding(text.slice(0, 8000));
      if (embedding) {
        db.upsertEmbedding(item.id, embedding);
      }
      if (isEffectiveImageItem(item)) {
        await computeAndStoreHash(item.id);
      }
      return true;
    } catch (err) {
      console.error(
        { err, originalName: item.originalName },
        "Auto-index failed",
      );
      return false;
    }
  } finally {
    if (trackBackground) endBackgroundIndex();
  }
}

export async function indexMediaItems(
  items: MediaItem[],
  options: { skipIndexed?: boolean; signal?: AbortSignal } = {},
): Promise<{ indexed: number; skipped: number; cancelled?: boolean }> {
  const signal = options.signal;
  const skipIndexed = options.skipIndexed ?? true;
  const indexedIds = skipIndexed ? db.getIndexedMediaIds() : new Set<string>();

  const toIndex = items.filter((i) => !skipIndexed || !indexedIds.has(i.id));
  setIndexProgress(0, toIndex.length);

  const imageItems = toIndex.filter((i) => isEffectiveImageItem(i));
  const videoItems = toIndex.filter(
    (i) => isVideoMime(i.mimeType) && !isEffectiveImageItem(i),
  );
  const imageIds = [...new Set(imageItems.map((i) => i.id))];
  const imageItemsById = new Map(imageItems.map((i) => [i.id, i]));

  for (const item of videoItems) {
    const filePath = path.join(mediaDir, item.filename);
    const meta = await extractVideoMetadata(filePath, {
      mediaId: item.id,
      originalName: item.originalName,
    });
    if (meta.dateTaken) db.setMediaDateTaken(item.id, meta.dateTaken);
  }

  // Clear existing auto tags for images we're re-indexing (manual tags are preserved).
  for (const id of imageIds) {
    db.setImagePeople(id, []);
  }

  const imagePersonIds = new Map<string, number[]>();
  const imagePersonEntries = new Map<
    string,
    Array<{
      personId: number;
      box?: { x: number; y: number; width: number; height: number };
    }>
  >();

  if (imageIds.length > 0) {
    const allFaces: FaceInImage[] = [];
    for (const id of imageIds) {
      const item = imageItemsById.get(id);
      if (!item) continue;
      try {
        const filePath = path.join(mediaDir, item.filename);
        const [faces, exif] = await Promise.all([
          extractFacesFromImage(filePath, item.id),
          extractExifData(filePath),
        ]);
        if (exif.dateTaken) db.setMediaDateTaken(item.id, exif.dateTaken);
        if (exif.latitude != null && exif.longitude != null) {
          db.setMediaLocation(item.id, exif.latitude, exif.longitude);
        }
        allFaces.push(...faces);
      } catch (err) {
        console.error(
          { err, originalName: item.originalName },
          "Face extraction failed",
        );
      }
    }
    if (allFaces.length > 0) {
      const entriesMap = await clusterAllFaces(allFaces);
      const personIds = new Set<number>();
      for (const entries of entriesMap.values()) {
        for (const e of entries) personIds.add(e.personId);
      }
      for (const pid of personIds) {
        if (!db.getPersonName(pid)) {
          db.setPersonName(pid, `Person ${pid}`);
        }
      }
      for (const [mediaId, entries] of entriesMap) {
        db.setImagePeople(mediaId, entries);
        imagePersonEntries.set(mediaId, entries);
        imagePersonIds.set(
          mediaId,
          entries.map((e) => e.personId),
        );
      }
    }
  }

  const progress = { indexed: 0, processed: 0 };

  for (const item of toIndex) {
    if (signal?.aborted) {
      const skipped = items.length - progress.indexed;
      return { indexed: progress.indexed, skipped, cancelled: true };
    }
    try {
      const text = await getTextForItem(item, imagePersonIds);
      if (!text.trim()) {
        progress.processed++;
        setIndexProgress(progress.processed, toIndex.length);
        continue;
      }
      const embedding = await getEmbedding(text.slice(0, 8000));
      if (embedding) {
        db.upsertEmbedding(item.id, embedding);
        progress.indexed++;
      }
    } catch (err) {
      console.error(
        { err, originalName: item.originalName },
        "Failed to index item",
      );
    }
    progress.processed++;
    setIndexProgress(progress.processed, toIndex.length);
  }

  const skipped = items.length - progress.indexed;
  return { indexed: progress.indexed, skipped };
}

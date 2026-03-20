import { Router } from "express";
import multer from "multer";
import path from "path";
import { readFile, unlink, access } from "fs/promises";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import sharp from "sharp";
import * as db from "../db/media.js";
import * as authDb from "../db/auth.js";
import { indexMediaItem } from "../indexing/media.js";
import { extractFacesFromImage } from "../faces.js";
import {
  tryRestoreMediaFromBackup,
  tryRestoreVideoThumbnailFromBackup,
  scheduleBackupSyncAfterUpload,
} from "../s3/sync.js";
import { mediaDir, thumbnailsDir } from "../config/paths.js";

const execFileAsync = promisify(execFile);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mediaDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage });

type MediaItemRow = NonNullable<ReturnType<typeof db.getMediaById>>;

/** If the file is missing locally but the row says it was backed up, pull it from S3. */
async function ensureLocalMediaFile(item: MediaItemRow): Promise<boolean> {
  const filePath = path.join(mediaDir, item.filename);
  try {
    await access(filePath);
    return true;
  } catch {
    if (!item.backedUpAt) return false;
    const ok = await tryRestoreMediaFromBackup(item);
    if (!ok) return false;
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const mediaRouter = Router();

mediaRouter.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const id = path.parse(req.file.filename).name;
  const ownerId = req.session?.userId ?? authDb.getDefaultOwnerId();
  if (ownerId == null) {
    res.status(500).json({
      error: "FIRST_ADMIN_EMAIL must be set when AUTH_ENABLED is false",
    });
    return;
  }
  db.insertMedia(
    id,
    req.file.filename,
    req.file.originalname,
    req.file.mimetype,
    req.file.size,
    ownerId
  );
  scheduleBackupSyncAfterUpload();
  const item = {
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date().toISOString(),
  };
  // Auto-index in background (fire-and-forget)
  indexMediaItem(item).catch((err) =>
    console.error(`Auto-index failed for ${item.originalName}:`, err)
  );
  res.status(201).json({
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});

mediaRouter.get("/", (req, res) => {
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 50), 100);
  const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
  const personIdParam = req.query.personId as string | undefined;
  const personId = personIdParam ? parseInt(personIdParam, 10) : undefined;
  const sortBy = (req.query.sortBy as string) === "taken" ? "taken" : "uploaded";
  const items =
    personId != null && !isNaN(personId)
      ? db.listMediaPaginated(limit, offset, personId, sortBy)
      : db.listMediaPaginated(limit, offset, undefined, sortBy);
  const total =
    personId != null && !isNaN(personId) ? db.getMediaCountForPerson(personId) : db.getMediaCount();
  const indexedIds = db.getIndexedMediaIds();
  const personNames = db.getPersonNames();
  const enriched = items.map((item) => {
    const personIds = db.getImagePeople(item.id);
    const people = personIds.map((pid) => personNames.get(pid) ?? `Person ${pid}`);
    return {
      ...item,
      indexed: indexedIds.has(item.id),
      backedUp: !!item.backedUpAt,
      people: people.length ? people : undefined,
    };
  });
  res.json({ items: enriched, total });
});

mediaRouter.get("/:id", async (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const ok = await ensureLocalMediaFile(item);
  if (!ok) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const filePath = path.join(mediaDir, item.filename);
  res.download(filePath, item.originalName, (err) => {
    if (err && !res.headersSent) res.status(500).json({ error: "Download failed" });
  });
});

mediaRouter.delete("/:id/people/:personId", (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const personId = parseInt(req.params.personId, 10);
  if (isNaN(personId) || personId < 1) {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  const removed = db.removePersonFromMedia(item.id, personId);
  if (!removed) {
    res.status(404).json({ error: "Person not tagged in this image" });
    return;
  }
  res.status(204).send();
});

mediaRouter.put("/:id/people/:personId", (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const fromPersonId = parseInt(req.params.personId, 10);
  const toPersonId = parseInt(String(req.body?.assignTo ?? ""), 10);
  if (isNaN(fromPersonId) || fromPersonId < 1 || isNaN(toPersonId) || toPersonId < 1) {
    res.status(400).json({ error: "assignTo (person ID) required" });
    return;
  }
  if (fromPersonId === toPersonId) {
    res.status(400).json({ error: "Cannot reassign to the same person" });
    return;
  }
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(toPersonId)) {
    res.status(400).json({ error: "Target person not found" });
    return;
  }
  const ok = db.reassignPersonInMedia(item.id, fromPersonId, toPersonId);
  if (!ok) {
    res.status(404).json({ error: "Person not tagged in this image" });
    return;
  }
  res.json({ reassigned: fromPersonId, to: toPersonId });
});

mediaRouter.post("/:id/people/:personId/reassign-new", (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const fromPersonId = parseInt(req.params.personId, 10);
  if (isNaN(fromPersonId) || fromPersonId < 1) {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  const newId = db.createNewPersonForMedia(item.id, fromPersonId);
  if (newId === null) {
    res.status(404).json({ error: "Person not tagged in this image" });
    return;
  }
  res.json({ newPersonId: newId });
});

mediaRouter.post("/:id/people/:personId/confirm", (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const personId = parseInt(req.params.personId, 10);
  if (isNaN(personId) || personId < 1) {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  const hasTag = db.getImagePeople(item.id).includes(personId);
  if (!hasTag) {
    res.status(404).json({ error: "Person not tagged in this image" });
    return;
  }
  db.confirmFace(item.id, personId);
  res.json({ confirmed: true });
});

mediaRouter.delete("/:id", async (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const ownerId = db.getMediaOwnerId(item.id);
  const userId = req.session?.userId;
  const isAdmin = req.session?.isAdmin;
  const canDelete = isAdmin || (ownerId != null && userId === ownerId);
  if (!canDelete) {
    res.status(403).json({ error: "Only the owner or an admin can delete this file" });
    return;
  }
  try {
    const filePath = path.join(mediaDir, item.filename);
    await unlink(filePath);
    if (item.mimeType.startsWith("video/")) {
      const thumbPath = path.join(thumbnailsDir, `${item.id}.jpg`);
      await unlink(thumbPath).catch(() => {});
    }
    db.deleteMedia(item.id);
    res.status(204).send();
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

mediaRouter.get("/:id/faces", async (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item || !item.mimeType.startsWith("image/")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const ok = await ensureLocalMediaFile(item);
  if (!ok) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const filePath = path.join(mediaDir, item.filename);
  try {
    const faces = await extractFacesFromImage(filePath, item.id);
    const detected = faces
      .map((f) => f.box)
      .filter((b): b is { x: number; y: number; width: number; height: number } => !!b);
    const tagged = db.getTaggedFacesInMedia(item.id);
    const personNames = db.getPersonNames();
    res.json({
      detected,
      tagged: tagged.map((t) => ({
        ...t,
        name: personNames.get(t.personId) ?? `Person ${t.personId}`,
      })),
    });
  } catch (err) {
    console.error("Face detection error:", err);
    res.status(500).json({ error: "Face detection failed" });
  }
});

mediaRouter.post("/:id/people", (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item || !item.mimeType.startsWith("image/")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const personId = req.body?.personId;
  const box = req.body?.box;
  const createNew = req.body?.createNew === true;
  if (
    !box ||
    typeof box.x !== "number" ||
    typeof box.y !== "number" ||
    typeof box.width !== "number" ||
    typeof box.height !== "number"
  ) {
    res.status(400).json({ error: "box { x, y, width, height } required" });
    return;
  }
  if (createNew) {
    const targetPersonId = db.createNewPerson();
    db.addPersonToMedia(item.id, targetPersonId, box);
    res.status(201).json({ personId: targetPersonId });
    return;
  }
  const id = parseInt(String(personId ?? ""), 10);
  if (isNaN(id) || id < 1) {
    res.status(400).json({ error: "personId required when not createNew" });
    return;
  }
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(id)) {
    res.status(400).json({ error: "Person not found" });
    return;
  }
  const targetPersonId = id;
  db.addPersonToMedia(item.id, targetPersonId, box);
  res.status(201).json({ personId: targetPersonId });
});

mediaRouter.get("/:id/face/:personId", async (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item || !item.mimeType.startsWith("image/")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const personId = parseInt(req.params.personId, 10);
  if (isNaN(personId) || personId < 1) {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  const personIds = db.getImagePeople(item.id);
  if (!personIds.includes(personId)) {
    res.status(404).json({ error: "Person not in this image" });
    return;
  }
  const ok = await ensureLocalMediaFile(item);
  if (!ok) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const box = db.getFaceBox(item.id, personId);
  const filePath = path.join(mediaDir, item.filename);
  try {
    if (box && box.width > 0 && box.height > 0) {
      const left = Math.round(Math.max(0, box.x));
      const top = Math.round(Math.max(0, box.y));
      const width = Math.round(Math.max(1, box.width));
      const height = Math.round(Math.max(1, box.height));
      const buffer = await sharp(filePath).extract({ left, top, width, height }).toBuffer();
      res.setHeader("Content-Type", item.mimeType);
      res.send(buffer);
    } else {
      res.sendFile(filePath, { headers: { "Content-Type": item.mimeType } });
    }
  } catch (err) {
    console.error("Face crop error:", err);
    res.status(500).json({ error: "Failed to crop image" });
  }
});

mediaRouter.get("/:id/preview", async (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const ok = await ensureLocalMediaFile(item);
  if (!ok) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const filePath = path.join(mediaDir, item.filename);
  res.sendFile(filePath, { headers: { "Content-Type": item.mimeType } });
});

mediaRouter.get("/:id/details", (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const personIds = db.getImagePeople(item.id);
  const personNames = db.getPersonNames();
  const people = personIds.map((pid) => personNames.get(pid) ?? `Person ${pid}`);
  const indexedIds = db.getIndexedMediaIds();
  res.json({
    ...item,
    people: people.length ? people : undefined,
    indexed: indexedIds.has(item.id),
    backedUp: !!item.backedUpAt,
  });
});

mediaRouter.get("/:id/thumbnail", async (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (item.mimeType.startsWith("image/")) {
    const ok = await ensureLocalMediaFile(item);
    if (!ok) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const filePath = path.join(mediaDir, item.filename);
    res.sendFile(filePath, { headers: { "Content-Type": item.mimeType } });
    return;
  }
  if (!item.mimeType.startsWith("video/")) {
    res.status(400).json({ error: "Thumbnail only supported for images and videos" });
    return;
  }
  const mediaOk = await ensureLocalMediaFile(item);
  if (!mediaOk) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const thumbPath = path.join(thumbnailsDir, `${item.id}.jpg`);
  const srcPath = path.join(mediaDir, item.filename);
  try {
    try {
      await access(thumbPath);
    } catch {
      if (item.backedUpAt) {
        await tryRestoreVideoThumbnailFromBackup(item.id);
      }
      try {
        await access(thumbPath);
      } catch {
        await execFileAsync("ffmpeg", [
          "-ss",
          "0.5",
          "-i",
          srcPath,
          "-vframes",
          "1",
          "-f",
          "image2",
          "-an",
          "-y",
          thumbPath,
        ]);
      }
    }
    res.setHeader("Content-Type", "image/jpeg");
    res.sendFile(thumbPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      res.status(503).json({
        error:
          "ffmpeg not found. Install ffmpeg to generate video thumbnails (e.g. apt install ffmpeg).",
      });
      return;
    }
    console.error("Video thumbnail error:", err);
    res.status(500).json({ error: "Failed to generate video thumbnail" });
  }
});

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

mediaRouter.get("/:id/content", async (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!TEXT_MIMES.has(item.mimeType)) {
    res.status(400).json({ error: "Content endpoint only supports text files" });
    return;
  }
  try {
    const ok = await ensureLocalMediaFile(item);
    if (!ok) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const filePath = path.join(mediaDir, item.filename);
    const content = await readFile(filePath, "utf-8");
    res.type("text/plain").send(content);
  } catch {
    res.status(500).json({ error: "Failed to read file" });
  }
});

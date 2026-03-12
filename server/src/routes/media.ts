import { Router } from "express";
import multer from "multer";
import path from "path";
import { readFile, unlink } from "fs/promises";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import sharp from "sharp";
import * as db from "../db.js";
import { indexMediaItem } from "../index-media.js";
import { extractFacesFromImage } from "../faces.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, "../../../../data/media");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mediaDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

export const mediaRouter = Router();

mediaRouter.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const id = path.parse(req.file.filename).name;
  db.insertMedia(
    id,
    req.file.filename,
    req.file.originalname,
    req.file.mimetype,
    req.file.size
  );
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
  const limit = Math.min(
    Math.max(1, parseInt(req.query.limit as string, 10) || 50),
    100
  );
  const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
  const personIdParam = req.query.personId as string | undefined;
  const personId = personIdParam ? parseInt(personIdParam, 10) : undefined;
  const items =
    personId != null && !isNaN(personId)
      ? db.listMediaPaginated(limit, offset, personId)
      : db.listMediaPaginated(limit, offset);
  const total =
    personId != null && !isNaN(personId)
      ? db.getMediaCountForPerson(personId)
      : db.getMediaCount();
  const indexedIds = db.getIndexedMediaIds();
  const personNames = db.getPersonNames();
  const enriched = items.map((item) => {
    const personIds = db.getImagePeople(item.id);
    const people = personIds.map((pid) => personNames.get(pid) ?? `Person ${pid}`);
    return {
      ...item,
      indexed: indexedIds.has(item.id),
      people: people.length ? people : undefined,
    };
  });
  res.json({ items: enriched, total });
});

mediaRouter.get("/:id", (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
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

mediaRouter.delete("/:id", async (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const filePath = path.join(mediaDir, item.filename);
    await unlink(filePath);
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
  const filePath = path.join(mediaDir, item.filename);
  try {
    const faces = await extractFacesFromImage(filePath, item.id);
    const detected = faces.map((f) => f.box).filter((b): b is { x: number; y: number; width: number; height: number } => !!b);
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
  if (!box || typeof box.x !== "number" || typeof box.y !== "number" || typeof box.width !== "number" || typeof box.height !== "number") {
    res.status(400).json({ error: "box { x, y, width, height } required" });
    return;
  }
  let targetPersonId: number;
  if (createNew) {
    targetPersonId = db.createNewPerson();
  } else {
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
    targetPersonId = id;
  }
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
  const box = db.getFaceBox(item.id, personId);
  const filePath = path.join(mediaDir, item.filename);
  try {
    if (box && box.width > 0 && box.height > 0) {
      const left = Math.round(Math.max(0, box.x));
      const top = Math.round(Math.max(0, box.y));
      const width = Math.round(Math.max(1, box.width));
      const height = Math.round(Math.max(1, box.height));
      const buffer = await sharp(filePath)
        .extract({ left, top, width, height })
        .toBuffer();
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

mediaRouter.get("/:id/preview", (req, res) => {
  const item = db.getMediaById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const filePath = path.join(mediaDir, item.filename);
  res.sendFile(filePath, { headers: { "Content-Type": item.mimeType } });
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
    const filePath = path.join(mediaDir, item.filename);
    const content = await readFile(filePath, "utf-8");
    res.type("text/plain").send(content);
  } catch {
    res.status(500).json({ error: "Failed to read file" });
  }
});

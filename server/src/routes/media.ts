import { Router } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import * as authDb from "../db/auth.js";
import * as db from "../db/media.js";
import {
  addPersonToMediaTag,
  confirmFaceTag,
  deleteMediaItem,
  updateMediaDateTaken,
  ensureLocalMediaFile,
  getFaceCropOrFullImage,
  getFacesPayloadForMedia,
  getMediaDetailsEnriched,
  getMediaPreviewFile,
  getThumbnailResponse,
  listMediaEnriched,
  persistUploadedMedia,
  readTextMediaContent,
  reassignPersonInMediaTag,
  reassignToNewPerson,
  removePersonFromMediaTag,
} from "../services/media-service.js";
import { mediaDir } from "../config/paths.js";
import { resolveMimeTypeAfterUpload } from "../lib/effective-image.js";
import { parseWithSchema } from "../validation/parse.js";
import {
  addPersonToMediaBodySchema,
  mediaIdParamSchema,
  mediaIdPersonIdParamSchema,
  mediaListQuerySchema,
  reassignFaceBodySchema,
  uploadCheckNamesBodySchema,
} from "../validation/media-schemas.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mediaDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage });

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
  const absolutePath = path.join(mediaDir, req.file.filename);
  const mimeType = await resolveMimeTypeAfterUpload(
    req.file.originalname,
    req.file.mimetype,
    absolutePath
  );
  persistUploadedMedia({
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType,
    size: req.file.size,
    ownerId,
  });
  res.status(201).json({
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType,
    size: req.file.size,
  });
});

mediaRouter.post("/upload/check-names", (req, res) => {
  const { names } = parseWithSchema(uploadCheckNamesBodySchema, req.body);
  const conflicts: Array<{
    requestedName: string;
    existing: { id: string; originalName: string; uploadedAt: string };
  }> = [];
  for (const requestedName of names) {
    const existing = db.findExistingMediaByOriginalName(requestedName);
    if (existing) {
      conflicts.push({ requestedName, existing });
    }
  }
  res.json({ conflicts });
});

mediaRouter.get("/", (req, res) => {
  const { limit, offset, personId, sortBy } = parseWithSchema(mediaListQuerySchema, req.query);
  const { items, total } = listMediaEnriched({
    limit,
    offset,
    personId,
    sortBy,
  });
  res.json({ items, total });
});

mediaRouter.get("/:id", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const item = db.getMediaById(id);
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
  const { id, personId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const result = removePersonFromMediaTag(id, personId);
  if (result.ok) {
    res.status(204).send();
    return;
  }
  if (result.reason === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (result.reason === "bad_person") {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  if (result.reason === "not_tagged") {
    res.status(404).json({ error: "Person not tagged in this image" });
    return;
  }
  res.status(404).json({ error: "Not found" });
});

mediaRouter.put("/:id/people/:personId", (req, res) => {
  const { id, personId: fromPersonId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const { assignTo: toPersonId } = parseWithSchema(reassignFaceBodySchema, req.body);
  const result = reassignPersonInMediaTag(id, fromPersonId, toPersonId);
  if (result.ok) {
    res.json(result.body);
    return;
  }
  if (result.reason === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (result.reason === "bad_ids") {
    res.status(400).json({ error: "assignTo (person ID) required" });
    return;
  }
  if (result.reason === "same_person") {
    res.status(400).json({ error: "Cannot reassign to the same person" });
    return;
  }
  if (result.reason === "target_missing") {
    res.status(400).json({ error: "Target person not found" });
    return;
  }
  res.status(404).json({ error: "Person not tagged in this image" });
});

mediaRouter.post("/:id/people/:personId/reassign-new", (req, res) => {
  const { id, personId: fromPersonId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const result = reassignToNewPerson(id, fromPersonId);
  if (result.ok) {
    res.json(result.body);
    return;
  }
  if (result.reason === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (result.reason === "bad_person") {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  res.status(404).json({ error: "Person not tagged in this image" });
});

mediaRouter.post("/:id/people/:personId/confirm", (req, res) => {
  const { id, personId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const result = confirmFaceTag(id, personId);
  if (result.ok) {
    res.json({ confirmed: true });
    return;
  }
  if (result.reason === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (result.reason === "bad_person") {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  res.status(404).json({ error: "Person not tagged in this image" });
});

mediaRouter.delete("/:id", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const result = await deleteMediaItem(id, {
    userId: req.session?.userId,
    isAdmin: req.session?.isAdmin,
  });
  if (result.ok) {
    res.status(204).send();
    return;
  }
  if (result.reason === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (result.reason === "forbidden") {
    res.status(403).json({ error: "Only the owner or an admin can delete this file" });
    return;
  }
  res.status(500).json({ error: "Failed to delete file" });
});

mediaRouter.patch("/:id", (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const result = updateMediaDateTaken(id, req.body, {
    userId: req.session?.userId,
    isAdmin: req.session?.isAdmin,
  });
  if (result.ok) {
    res.json({ dateTaken: result.dateTaken });
    return;
  }
  if (result.reason === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (result.reason === "forbidden") {
    res.status(403).json({ error: "Only the owner or an admin can edit this file" });
    return;
  }
  if (result.reason === "bad_request") {
    res.status(400).json({ error: "JSON body must include dateTaken (ISO string or null to clear)" });
    return;
  }
  res.status(400).json({
    error: "That dateTaken value is not a valid date or time. Use an ISO 8601 timestamp or null to clear.",
  });
});

mediaRouter.get("/:id/faces", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = await getFacesPayloadForMedia(id);
  if (!out.ok) {
    if (out.reason === "not_found") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (out.reason === "file_missing") {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.status(500).json({ error: "Face detection failed" });
    return;
  }
  res.json(out.body);
});

mediaRouter.post("/:id/people", (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const body = parseWithSchema(addPersonToMediaBodySchema, req.body);
  const result = addPersonToMediaTag({
    mediaId: id,
    personId: body.personId,
    box: body.box,
    createNew: body.createNew === true,
  });
  if (result.ok) {
    res.status(result.status).json(result.body);
    return;
  }
  if (result.status === 404) {
    res.status(404).json({ error: result.error });
    return;
  }
  res.status(400).json({ error: result.error });
});

mediaRouter.get("/:id/face/:personId", async (req, res) => {
  const { id, personId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const out = await getFaceCropOrFullImage(id, personId);
  if (!out.ok) {
    if (out.reason === "not_found") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (out.reason === "bad_request") {
      res.status(400).json({ error: "Invalid person ID" });
      return;
    }
    if (out.reason === "person_not_in_image") {
      res.status(404).json({ error: "Person not in this image" });
      return;
    }
    if (out.reason === "file_missing") {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.status(500).json({ error: "Failed to crop image" });
    return;
  }
  if (out.kind === "buffer") {
    res.setHeader("Content-Type", out.mimeType);
    res.send(out.buffer);
    return;
  }
  res.sendFile(out.path, { headers: { "Content-Type": out.mimeType } });
});

mediaRouter.get("/:id/preview", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = await getMediaPreviewFile(id);
  if (!out.ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendFile(out.path, { headers: { "Content-Type": out.mimeType } });
});

mediaRouter.get("/:id/details", (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = getMediaDetailsEnriched(id);
  if (!out.ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(out.body);
});

mediaRouter.get("/:id/thumbnail", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = await getThumbnailResponse(id);
  if (!out.ok) {
    if (out.reason === "not_found") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (out.reason === "bad_type") {
      res.status(400).json({ error: "Thumbnail only supported for images and videos" });
      return;
    }
    if (out.reason === "file_missing") {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (out.reason === "ffmpeg_missing") {
      res.status(503).json({
        error:
          "ffmpeg not found. Install ffmpeg to generate video thumbnails (e.g. apt install ffmpeg).",
      });
      return;
    }
    res.status(500).json({ error: "Failed to generate video thumbnail" });
    return;
  }
  res.setHeader("Content-Type", out.contentType);
  res.sendFile(out.path);
});

mediaRouter.get("/:id/content", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = await readTextMediaContent(id);
  if (!out.ok) {
    if (out.reason === "not_found") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (out.reason === "not_text") {
      res.status(400).json({ error: "Content endpoint only supports text files" });
      return;
    }
    if (out.reason === "file_missing") {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.status(500).json({ error: "Failed to read file" });
    return;
  }
  res.type("text/plain").send(out.content);
});

import { Router } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import * as authDb from "../../db/auth.js";
import * as db from "../../db/media.js";
import { mediaDir } from "../../config/paths.js";
import { resolveMimeTypeAfterUpload } from "../../lib/effective-image.js";
import { deleteMediaItem, persistUploadedMedia, updateMediaDateTaken } from "../../services/media-service.js";
import { parseWithSchema } from "../../validation/parse.js";
import { mediaIdParamSchema, uploadCheckNamesBodySchema } from "../../validation/media-schemas.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mediaDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage });

export const mediaWriteRouter = Router();

mediaWriteRouter.post("/upload", upload.single("file"), async (req, res) => {
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

mediaWriteRouter.post("/upload/check-names", (req, res) => {
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

mediaWriteRouter.delete("/:id", async (req, res) => {
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

mediaWriteRouter.patch("/:id", (req, res) => {
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


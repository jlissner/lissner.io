import { Router } from "express";
import multer from "multer";
import { sendApiError } from "../../lib/api-error.js";
import path from "path";
import { randomUUID } from "crypto";
import * as authDb from "../../db/auth.js";
import * as db from "../../db/media.js";
import { mediaDir } from "../../config/paths.js";
import { resolveMimeTypeAfterUpload } from "../../lib/effective-image.js";
import {
  deleteMediaItem,
  persistUploadedMedia,
  updateMediaDateTaken,
} from "../../services/media-service.js";
import { setMediaTags } from "../../services/media-tags-service.js";
import { parseWithSchema } from "../../validation/parse.js";
import {
  mediaIdParamSchema,
  mediaTagsBodySchema,
  uploadCheckNamesBodySchema,
} from "../../validation/media-schemas.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mediaDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage });

export const mediaWriteRouter = Router();

mediaWriteRouter.post(
  "/share-target",
  upload.array("files"),
  async (req, res) => {
    const ownerId = req.jwtUser?.id ?? authDb.getDefaultOwnerId();
    if (ownerId == null) {
      sendApiError(
        res,
        500,
        "FIRST_ADMIN_EMAIL must be set when AUTH_ENABLED is false",
        "upload_owner_config",
      );
      return;
    }
    if (!req.files || req.files.length === 0) {
      sendApiError(res, 400, "No files shared", "no_files_shared");
      return;
    }
    const uploaded = [];
    for (const file of req.files as Express.Multer.File[]) {
      const id = path.parse(file.filename).name;
      const absolutePath = path.join(mediaDir, file.filename);
      const mimeType = await resolveMimeTypeAfterUpload(
        file.originalname,
        file.mimetype,
        absolutePath,
      );
      persistUploadedMedia({
        id,
        filename: file.filename,
        originalName: file.originalname,
        mimeType,
        size: file.size,
        ownerId,
      });
      uploaded.push({
        id,
        filename: file.filename,
        originalName: file.originalname,
        mimeType,
        size: file.size,
      });
    }
    res.redirect("/?uploaded=" + uploaded.map((u) => u.id).join(","));
  },
);

mediaWriteRouter.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    sendApiError(res, 400, "No file uploaded", "no_file_uploaded");
    return;
  }
  const id = path.parse(req.file.filename).name;
  const ownerId = req.jwtUser?.id ?? authDb.getDefaultOwnerId();
  if (ownerId == null) {
    sendApiError(
      res,
      500,
      "FIRST_ADMIN_EMAIL must be set when AUTH_ENABLED is false",
      "upload_owner_config",
    );
    return;
  }
  const absolutePath = path.join(mediaDir, req.file.filename);
  const mimeType = await resolveMimeTypeAfterUpload(
    req.file.originalname,
    req.file.mimetype,
    absolutePath,
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

mediaWriteRouter.put("/:id/tags", (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const body = parseWithSchema(mediaTagsBodySchema, req.body);
  const result = setMediaTags(id, body.tags, {
    userId: req.jwtUser?.id,
    isAdmin: req.jwtUser?.isAdmin,
  });
  if (result.ok) {
    res.json({ ok: true as const });
    return;
  }
  if (result.reason === "not_found") {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  sendApiError(
    res,
    403,
    "Only the owner or an admin can edit tags",
    "patch_forbidden",
  );
});

mediaWriteRouter.delete("/:id", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const result = await deleteMediaItem(id, {
    userId: req.jwtUser?.id,
    isAdmin: req.jwtUser?.isAdmin,
  });
  if (result.ok) {
    res.status(204).send();
    return;
  }
  if (result.reason === "not_found") {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  if (result.reason === "forbidden") {
    sendApiError(
      res,
      403,
      "Only the owner or an admin can delete this file",
      "delete_forbidden",
    );
    return;
  }
  sendApiError(res, 500, "Failed to delete file", "delete_failed");
});

mediaWriteRouter.patch("/:id", (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const result = updateMediaDateTaken(id, req.body, {
    userId: req.jwtUser?.id,
    isAdmin: req.jwtUser?.isAdmin,
  });
  if (result.ok) {
    res.json({ dateTaken: result.dateTaken });
    return;
  }
  if (result.reason === "not_found") {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  if (result.reason === "forbidden") {
    sendApiError(
      res,
      403,
      "Only the owner or an admin can edit this file",
      "patch_forbidden",
    );
    return;
  }
  if (result.reason === "bad_request") {
    sendApiError(
      res,
      400,
      "JSON body must include dateTaken (ISO string or null to clear)",
      "patch_bad_request",
    );
    return;
  }
  sendApiError(
    res,
    400,
    "That dateTaken value is not a valid date or time. Use an ISO 8601 timestamp or null to clear.",
    "patch_invalid_date",
  );
});

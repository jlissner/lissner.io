import { Router } from "express";
import path from "path";
import { sendApiError } from "../../lib/api-error.js";
import * as db from "../../db/media.js";
import {
  ensureLocalMediaFile,
  getFaceCropOrFullImage,
  getFacesPayloadForMedia,
  getMediaDetailsEnriched,
  getMediaPreviewFile,
  getThumbnailResponse,
  listMediaEnriched,
  readTextMediaContent,
} from "../../services/media-service.js";
import { listDistinctMediaTags } from "../../services/media-tags-service.js";
import { mediaDir } from "../../config/paths.js";
import { parseWithSchema } from "../../validation/parse.js";
import {
  mediaIdParamSchema,
  mediaIdPersonIdParamSchema,
  mediaListQuerySchema,
} from "../../validation/media-schemas.js";

export const mediaReadRouter = Router();

mediaReadRouter.get("/", (req, res) => {
  const { limit, offset, personId, sortBy } = parseWithSchema(mediaListQuerySchema, req.query);
  const { items, total } = listMediaEnriched({
    limit,
    offset,
    personId,
    sortBy,
  });
  res.json({ items, total });
});

mediaReadRouter.get("/timeline", (req, res) => {
  const { personId, sortBy } = parseWithSchema(mediaListQuerySchema, req.query);
  const months = db.getDistinctMonths(sortBy, personId);
  res.json({ months });
});

mediaReadRouter.get("/timeline/offset", (req, res) => {
  const { personId, sortBy } = parseWithSchema(mediaListQuerySchema, req.query);
  const monthKey = String(req.query.month ?? "");
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    res.status(400).json({ error: "month must be YYYY-MM" });
    return;
  }
  const offset = db.getOffsetForMonth(sortBy, monthKey, personId);
  res.json({ offset });
});

mediaReadRouter.get("/tags", (_req, res) => {
  res.json({ tags: listDistinctMediaTags() });
});

mediaReadRouter.get("/:id", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const item = db.getMediaById(id);
  if (!item) {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  const ok = await ensureLocalMediaFile(item);
  if (!ok) {
    sendApiError(res, 404, "File not found", "file_missing");
    return;
  }
  const filePath = path.join(mediaDir, item.filename);
  res.download(filePath, item.originalName, (err) => {
    if (err && !res.headersSent) sendApiError(res, 500, "Download failed", "download_failed");
  });
});

mediaReadRouter.get("/:id/faces", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = await getFacesPayloadForMedia(id);
  if (!out.ok) {
    if (out.reason === "not_found") {
      sendApiError(res, 404, "Not found", "not_found");
      return;
    }
    if (out.reason === "file_missing") {
      sendApiError(res, 404, "File not found", "file_missing");
      return;
    }
    sendApiError(res, 500, "Face detection failed", "face_detection_failed");
    return;
  }
  res.json(out.body);
});

mediaReadRouter.get("/:id/face/:personId", async (req, res) => {
  const { id, personId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const out = await getFaceCropOrFullImage(id, personId);
  if (!out.ok) {
    if (out.reason === "not_found") {
      sendApiError(res, 404, "Not found", "not_found");
      return;
    }
    if (out.reason === "bad_request") {
      sendApiError(res, 400, "Invalid person ID", "face_invalid_person");
      return;
    }
    if (out.reason === "person_not_in_image") {
      sendApiError(res, 404, "Person not in this image", "person_not_in_image");
      return;
    }
    if (out.reason === "file_missing") {
      sendApiError(res, 404, "File not found", "file_missing");
      return;
    }
    sendApiError(res, 500, "Failed to crop image", "crop_failed");
    return;
  }
  if (out.kind === "buffer") {
    res.setHeader("Content-Type", out.mimeType);
    res.send(out.buffer);
    return;
  }
  res.sendFile(out.path, { headers: { "Content-Type": out.mimeType } });
});

mediaReadRouter.get("/:id/preview", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = await getMediaPreviewFile(id);
  if (!out.ok) {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  if (out.kind === "file") {
    res.sendFile(out.path, { headers: { "Content-Type": out.mimeType } }, (err) => {
      if (err && !res.headersSent) sendApiError(res, 500, "Send failed", "internal_error");
    });
    return;
  }
  res.setHeader("Content-Type", out.mimeType);
  res.send(out.buffer);
});

mediaReadRouter.get("/:id/details", (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = getMediaDetailsEnriched(id);
  if (!out.ok) {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  res.json(out.body);
});

mediaReadRouter.get("/:id/thumbnail", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = await getThumbnailResponse(id);
  if (!out.ok) {
    if (out.reason === "not_found") {
      sendApiError(res, 404, "Not found", "not_found");
      return;
    }
    if (out.reason === "bad_type") {
      sendApiError(
        res,
        400,
        "Thumbnail only supported for images and videos",
        "thumbnail_bad_type"
      );
      return;
    }
    if (out.reason === "file_missing") {
      sendApiError(res, 404, "File not found", "file_missing");
      return;
    }
    if (out.reason === "ffmpeg_missing") {
      sendApiError(
        res,
        503,
        "ffmpeg not found. Install ffmpeg to generate video thumbnails (e.g. apt install ffmpeg).",
        "thumbnail_ffmpeg_missing"
      );
      return;
    }
    sendApiError(res, 500, "Failed to generate video thumbnail", "thumbnail_failed");
    return;
  }
  res.setHeader("Content-Type", out.contentType);
  res.setHeader("Cache-Control", "private, max-age=86400, immutable");
  res.sendFile(out.path);
});

mediaReadRouter.get("/:id/content", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = await readTextMediaContent(id);
  if (!out.ok) {
    if (out.reason === "not_found") {
      sendApiError(res, 404, "Not found", "not_found");
      return;
    }
    if (out.reason === "not_text") {
      sendApiError(res, 400, "Content endpoint only supports text files", "content_not_text");
      return;
    }
    if (out.reason === "file_missing") {
      sendApiError(res, 404, "File not found", "file_missing");
      return;
    }
    sendApiError(res, 500, "Failed to read file", "read_failed");
    return;
  }
  res.type("text/plain").send(out.content);
});

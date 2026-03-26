import { Router } from "express";
import path from "path";
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

mediaReadRouter.get("/:id", async (req, res) => {
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

mediaReadRouter.get("/:id/faces", async (req, res) => {
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

mediaReadRouter.get("/:id/face/:personId", async (req, res) => {
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

mediaReadRouter.get("/:id/preview", async (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = await getMediaPreviewFile(id);
  if (!out.ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendFile(out.path, { headers: { "Content-Type": out.mimeType } });
});

mediaReadRouter.get("/:id/details", (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const out = getMediaDetailsEnriched(id);
  if (!out.ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(out.body);
});

mediaReadRouter.get("/:id/thumbnail", async (req, res) => {
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

mediaReadRouter.get("/:id/content", async (req, res) => {
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


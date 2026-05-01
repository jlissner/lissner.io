import { Router } from "express";
import * as db from "../../db/media.js";
import { sendApiError } from "../../lib/api-error.js";
import { parseWithSchema } from "../../validation/parse.js";
import { mediaIdParamSchema } from "../../validation/media-schemas.js";

export const adminMediaFileIssuesRouter = Router();

adminMediaFileIssuesRouter.get("/media-file-issues", (_req, res) => {
  const items = db.listMediaWithFileIssues();
  res.json({ items });
});

adminMediaFileIssuesRouter.post("/media-file-issues/:id/clear", (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const row = db.getMediaById(id);
  if (!row) {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  db.clearMediaFileIssue(id);
  res.json({ ok: true as const });
});

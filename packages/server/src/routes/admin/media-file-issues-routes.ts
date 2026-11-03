import { Router } from "express";
import * as db from "../../db/media.js";
import { sendApiError } from "../../lib/api-error.js";
import { mediaIdParamSchema } from "../../validation/media-schemas.js";

export const adminMediaFileIssuesRouter = Router();

adminMediaFileIssuesRouter.get("/media-file-issues", async (_req, res) => {
  const items = await db.listMediaWithFileIssues();
  res.json({ items });
});

adminMediaFileIssuesRouter.post(
  "/media-file-issues/:id/clear",
  async (req, res) => {
    const { id } = mediaIdParamSchema.parse(req.params);
    const row = await db.getMediaById(id);
    if (!row) {
      sendApiError(res, 404, "Not found", "not_found");
      return;
    }
    await db.clearMediaFileIssue(id);
    res.json({ ok: true as const });
  },
);

import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { parseWithSchema } from "../validation/parse.js";
import {
  clearAllSearchIndexData,
  getIndexStatusBody,
  searchMediaByQuery,
  startBulkIndexingJob,
} from "../services/search-service.js";
import { cancelBulkIndexJob } from "../indexing/job-store.js";
import {
  cancelIndexBodySchema,
  searchIndexBodySchema,
  searchIndexQuerySchema,
  searchListQuerySchema,
} from "../validation/search-schemas.js";

export const searchRouter = Router();

searchRouter.post("/index", (req, res) => {
  const { force } = parseWithSchema(searchIndexQuerySchema, req.query);
  const body = parseWithSchema(searchIndexBodySchema, req.body);
  const mediaIds = body?.mediaIds;
  const result = startBulkIndexingJob({ force, mediaIds });
  if (!result.ok) {
    res.status(409).json({ error: "Indexing already in progress" });
    return;
  }
  res.json({ started: true, jobId: result.jobId });
});

searchRouter.post("/index/cancel", (req, res) => {
  const body = parseWithSchema(cancelIndexBodySchema, req.body);
  const ok = cancelBulkIndexJob(body.jobId);
  if (!ok) {
    res.status(400).json({ error: "Job not found or not cancelable" });
    return;
  }
  res.json({ ok: true });
});

searchRouter.post("/index/clear", (_req, res) => {
  clearAllSearchIndexData();
  res.json({ cleared: true });
});

searchRouter.get("/index/status", (_req, res) => {
  res.json(getIndexStatusBody());
});

searchRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = parseWithSchema(searchListQuerySchema, req.query);
    const items = await searchMediaByQuery(query.q ?? "");
    res.json(items);
  })
);

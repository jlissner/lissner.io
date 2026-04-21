import { Router } from "express";
import { sendApiError } from "../lib/api-error.js";
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
    sendApiError(res, 409, "Indexing already in progress", result.reason);
    return;
  }
  res.json({ started: true, jobId: result.jobId });
});

searchRouter.post("/index/cancel", (req, res) => {
  const body = parseWithSchema(cancelIndexBodySchema, req.body);
  const ok = cancelBulkIndexJob(body.jobId);
  if (!ok) {
    sendApiError(res, 400, "Job not found or not cancelable", "index_job_not_cancelable");
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
    const searchResult = await searchMediaByQuery(query.q ?? "");
    if (!searchResult.ok) {
      if (searchResult.reason === "missing_query") {
        sendApiError(res, 400, "Missing query parameter: q", "missing_query");
        return;
      }
      if (searchResult.reason === "invalid_query") {
        sendApiError(res, 400, searchResult.message, "search_query_invalid");
        return;
      }
      sendApiError(res, 500, searchResult.message, "search_failed");
      return;
    }
    res.json(searchResult.items);
  })
);

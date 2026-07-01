import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAdmin } from "../auth/middleware.js";
import { sendApiError } from "../lib/api-error.js";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  clearAllSearchIndexData,
  getIndexStatusBody,
  searchMediaByQuery,
  searchTimelineMonths,
  searchTimelineOffset,
  startBulkIndexingJob,
} from "../services/search-service.js";
import { cancelBulkIndexJob } from "../indexing/job-store.js";
import {
  cancelIndexBodySchema,
  searchIndexBodySchema,
  searchIndexQuerySchema,
  searchListQuerySchema,
  searchTimelineOffsetQuerySchema,
  searchTimelineQuerySchema,
} from "../validation/search-schemas.js";

export function requireAdminForFullLibraryForceIndex(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { force } = searchIndexQuerySchema.parse(req.query);
  if (!force) {
    next();
    return;
  }
  const body = searchIndexBodySchema.parse(req.body);
  const mediaIds = body?.mediaIds;
  if (Array.isArray(mediaIds) && mediaIds.length > 0) {
    next();
    return;
  }
  requireAdmin(req, res, next);
}

function sendSearchFailure(
  res: Response,
  searchResult: { ok: false; reason: string; message?: string },
): void {
  if (searchResult.reason === "missing_query") {
    sendApiError(res, 400, "Missing query parameter: q", "missing_query");
    return;
  }
  if (searchResult.reason === "invalid_query") {
    sendApiError(
      res,
      400,
      searchResult.message ?? "Invalid search query",
      "search_query_invalid",
    );
    return;
  }
  sendApiError(
    res,
    500,
    searchResult.message ?? "Search failed",
    "search_failed",
  );
}

export const searchRouter = Router();

searchRouter.post(
  "/index",
  requireAdminForFullLibraryForceIndex,
  (req, res) => {
    const { force } = searchIndexQuerySchema.parse(req.query);
    const body = searchIndexBodySchema.parse(req.body);
    const mediaIds = body?.mediaIds;
    const result = startBulkIndexingJob({ force, mediaIds });
    if (!result.ok) {
      sendApiError(res, 409, "Indexing already in progress", result.reason);
      return;
    }
    res.json({ started: true, jobId: result.jobId });
  },
);

searchRouter.post("/index/cancel", requireAdmin, (req, res) => {
  const body = cancelIndexBodySchema.parse(req.body);
  const ok = cancelBulkIndexJob(body.jobId);
  if (!ok) {
    sendApiError(
      res,
      400,
      "Job not found or not cancelable",
      "index_job_not_cancelable",
    );
    return;
  }
  res.json({ ok: true });
});

searchRouter.post("/index/clear", requireAdmin, (_req, res) => {
  clearAllSearchIndexData();
  res.json({ cleared: true });
});

searchRouter.get("/index/status", (_req, res) => {
  res.json(getIndexStatusBody());
});

searchRouter.get(
  "/timeline/offset",
  asyncHandler(async (req, res) => {
    const query = searchTimelineOffsetQuerySchema.parse(req.query);
    const searchResult = await searchTimelineOffset(
      query.q,
      query.sortBy,
      query.month,
    );
    if (!searchResult.ok) {
      sendSearchFailure(res, searchResult);
      return;
    }
    res.json({ offset: searchResult.offset });
  }),
);

searchRouter.get(
  "/timeline",
  asyncHandler(async (req, res) => {
    const query = searchTimelineQuerySchema.parse(req.query);
    const searchResult = await searchTimelineMonths(query.q, query.sortBy);
    if (!searchResult.ok) {
      sendSearchFailure(res, searchResult);
      return;
    }
    res.json({ months: searchResult.months });
  }),
);

searchRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = searchListQuerySchema.parse(req.query);
    const searchResult = await searchMediaByQuery(query.q, {
      limit: query.limit,
      offset: query.offset,
    });
    if (!searchResult.ok) {
      sendSearchFailure(res, searchResult);
      return;
    }
    res.json({ items: searchResult.items, total: searchResult.total });
  }),
);

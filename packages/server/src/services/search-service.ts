import { IndexActivitySlice, SearchResultItem } from "@lissner/shared";
import { logger } from "../logger.js";
import * as db from "../db/media.js";
import { getEmbedding, cosineSimilarity } from "../embeddings.js";
import { indexMediaItems } from "../indexing/media.js";
import { buildActivitySnapshot } from "../activity/snapshot.js";
import {
  getIndexJobState,
  startIndexJob,
  finishIndexJob,
  failIndexJob,
} from "../indexing/job-store.js";
import { ServiceFailure } from "./service-result.js";
import { normalizePersonHandle } from "../lib/search-query-normalize.js";
import {
  parseSearchQuery,
  SearchQueryAst,
} from "../lib/search-query-parser.js";
import { getSyncState } from "../s3/sync-state.js";

export function getIndexStatusBody(): IndexActivitySlice {
  const snap = buildActivitySnapshot(getIndexJobState(), getSyncState());
  const s = snap.index;
  return {
    inProgress: s.inProgress,
    jobId: s.jobId,
    startedAt: s.startedAt,
    elapsedSeconds: s.elapsedSeconds,
    progressProcessed: s.progressProcessed,
    progressTotal: s.progressTotal,
    lastResult: s.lastResult,
    lastError: s.lastError,
  };
}

export async function clearAllSearchIndexData(): Promise<void> {
  await db.clearAllIndexingData();
}

type StartBulkIndexingJobResult =
  | { ok: true; jobId: string }
  | ServiceFailure<"index_in_progress">;

export async function startBulkIndexingJob(params: {
  force: boolean;
  mediaIds?: string[];
}): Promise<StartBulkIndexingJobResult> {
  const started = startIndexJob();
  if (!started.ok) return { ok: false, reason: "index_in_progress" };

  const allItems = await db.listMedia();
  const items =
    Array.isArray(params.mediaIds) && params.mediaIds.length > 0
      ? allItems.filter((i) => params.mediaIds!.includes(i.id))
      : allItems;

  void indexMediaItems(items, {
    skipIndexed: !params.force,
    signal: started.signal,
  })
    .then(({ indexed, skipped, cancelled }) => {
      finishIndexJob({
        indexed,
        skipped,
        total: items.length,
        ...(cancelled ? { cancelled: true } : {}),
      });
    })
    .catch((err: unknown) => {
      logger.error({ err }, "Index error");
      failIndexJob(err instanceof Error ? err.message : "Indexing failed");
    });

  return { ok: true, jobId: started.jobId };
}

const EMBEDDING_TOP = 20;

async function resolvePersonIdForHandle(
  handle: string,
): Promise<number | null> {
  const personNames = await db.getPersonNames();
  const matching = [...personNames.entries()].filter(
    ([, name]) => normalizePersonHandle(name) === handle,
  );
  if (matching.length === 0) {
    return null;
  }
  return Math.min(...matching.map(([id]) => id));
}

async function textSearchOrderedIds(text: string): Promise<string[]> {
  const stored = await db.getEmbeddings();
  if (stored.length === 0 || !text.trim()) {
    return [];
  }
  const queryEmbedding = await getEmbedding(text.trim());
  if (queryEmbedding === null) {
    return [];
  }
  const scored = stored.map(({ mediaId, embedding }) => ({
    mediaId,
    score: cosineSimilarity(queryEmbedding, JSON.parse(embedding) as number[]),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, EMBEDDING_TOP).map((s) => s.mediaId);
}

/** Media of every person whose display name contains the query as a substring. */
async function personNameSearchOrderedIds(query: string): Promise<string[]> {
  const queryLower = query.toLowerCase();
  const personNames = await db.getPersonNames();
  const matchingPersonIds = [...personNames.entries()]
    .filter(([, name]) => name.toLowerCase().includes(queryLower))
    .map(([id]) => id)
    .sort((a, b) => a - b);
  const seen = new Set<string>();
  const mediaIds: string[] = [];
  for (const personId of matchingPersonIds) {
    for (const id of (await db.getMediaForPerson(personId, 10000)).map(
      (m) => m.id,
    )) {
      if (!seen.has(id)) {
        mediaIds.push(id);
        seen.add(id);
      }
    }
  }
  return mediaIds;
}

async function evalAstOrdered(ast: SearchQueryAst): Promise<string[]> {
  switch (ast.kind) {
    case "tag":
      return db.getMediaIdsForTag(ast.tag);
    case "person": {
      const personId = await resolvePersonIdForHandle(ast.handle);
      if (personId == null) {
        return [];
      }
      return (await db.getMediaForPerson(personId, 10000)).map((m) => m.id);
    }
    case "personName":
      return personNameSearchOrderedIds(ast.text);
    case "text":
      return textSearchOrderedIds(ast.text);
    case "not": {
      const universe = await db.listVisibleGalleryMediaIds();
      const inner = await evalAstOrdered(ast.child);
      const exclude = new Set(inner);
      return universe.filter((id) => !exclude.has(id));
    }
    case "and": {
      const left = await evalAstOrdered(ast.left);
      const right = new Set(await evalAstOrdered(ast.right));
      return left.filter((id) => right.has(id));
    }
    case "or": {
      const left = await evalAstOrdered(ast.left);
      const right = await evalAstOrdered(ast.right);
      const seen = new Set(left);
      const out = [...left];
      for (const id of right) {
        if (!seen.has(id)) {
          seen.add(id);
          out.push(id);
        }
      }
      return out;
    }
    default: {
      const _x: never = ast;
      return _x;
    }
  }
}

type SearchQueryFailure =
  | ServiceFailure<"missing_query">
  | { ok: false; reason: "invalid_query"; message: string }
  | { ok: false; reason: "search_failed"; message: string };

type SearchMediaByQueryResult =
  | { ok: true; items: SearchResultItem[]; total: number }
  | SearchQueryFailure;

type SearchTimelineResult = { ok: true; months: string[] } | SearchQueryFailure;

type SearchTimelineOffsetResult =
  | { ok: true; offset: number }
  | SearchQueryFailure;

type MediaSortBy = "uploaded" | "taken";

type Instant = string | Date;
type MediaRow = Awaited<ReturnType<typeof db.getMediaByIds>>[number];

const toIsoString = (v: Instant): string =>
  v instanceof Date ? v.toISOString() : v;

const instantMs = (v: Instant): number => {
  const t = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isFinite(t) ? t : 0;
};

const sortInstant = (
  item: { uploadedAt: Instant; dateTaken?: Instant | null },
  sortBy: MediaSortBy,
): Instant =>
  sortBy === "uploaded" ? item.uploadedAt : (item.dateTaken ?? item.uploadedAt);

function monthKeyForItem(
  item: { uploadedAt: Instant; dateTaken?: Instant | null },
  sortBy: MediaSortBy,
): string {
  return toIsoString(sortInstant(item, sortBy)).slice(0, 7);
}

/** Newest first, then filename — matches gallery list order. */
const compareMediaChrono =
  (sortBy: MediaSortBy) =>
  (a: MediaRow, b: MediaRow): number => {
    const byDate =
      instantMs(sortInstant(b, sortBy)) - instantMs(sortInstant(a, sortBy));
    return byDate !== 0 ? byDate : a.filename.localeCompare(b.filename);
  };

async function visibleItemsChronological(
  mediaIds: string[],
  sortBy: MediaSortBy,
): Promise<MediaRow[]> {
  const items = (await db.getMediaByIds(mediaIds)).filter(
    (x) => !x.hideFromGallery,
  );
  return [...items].sort(compareMediaChrono(sortBy));
}

async function resolveSearchMediaIds(
  q: string,
): Promise<{ ok: true; mediaIds: string[] } | SearchQueryFailure> {
  const query = q.trim();
  if (!query) {
    return { ok: false, reason: "missing_query" };
  }

  const parsed = parseSearchQuery(query);
  if (!parsed.ok) {
    return { ok: false, reason: "invalid_query", message: parsed.message };
  }

  try {
    const mediaIds = await evalAstOrdered(parsed.ast);
    return { ok: true, mediaIds };
  } catch (err) {
    logger.error({ err }, "Search error");
    const message = err instanceof Error ? err.message : "Search failed";
    return { ok: false, reason: "search_failed", message };
  }
}

export async function searchMediaByQuery(
  q: string,
  pagination: { limit: number; offset: number; sortBy?: MediaSortBy },
): Promise<SearchMediaByQueryResult> {
  const sortBy = pagination.sortBy ?? "taken";
  const resolved = await resolveSearchMediaIds(q);
  if (!resolved.ok) return resolved;

  const { mediaIds } = resolved;
  if (mediaIds.length === 0) {
    return { ok: true, items: [], total: 0 };
  }

  const ordered = await visibleItemsChronological(mediaIds, sortBy);
  const page = ordered.slice(
    pagination.offset,
    pagination.offset + pagination.limit,
  );
  const personNames = await db.getPersonNames();
  return {
    ok: true,
    items: await mapSearchItems(page, personNames),
    total: ordered.length,
  };
}

export async function searchTimelineMonths(
  q: string,
  sortBy: MediaSortBy,
): Promise<SearchTimelineResult> {
  const resolved = await resolveSearchMediaIds(q);
  if (!resolved.ok) return resolved;

  if (resolved.mediaIds.length === 0) {
    return { ok: true, months: [] };
  }

  const monthSet = (
    await visibleItemsChronological(resolved.mediaIds, sortBy)
  ).reduce((acc, item) => {
    acc.add(monthKeyForItem(item, sortBy));
    return acc;
  }, new Set<string>());
  return {
    ok: true,
    months: [...monthSet].sort((a, b) => b.localeCompare(a)),
  };
}

export async function searchTimelineOffset(
  q: string,
  sortBy: MediaSortBy,
  monthKey: string,
): Promise<SearchTimelineOffsetResult> {
  const resolved = await resolveSearchMediaIds(q);
  if (!resolved.ok) return resolved;

  const ordered = await visibleItemsChronological(resolved.mediaIds, sortBy);
  const index = ordered.findIndex(
    (item) => monthKeyForItem(item, sortBy) === monthKey,
  );
  return { ok: true, offset: index >= 0 ? index : 0 };
}

async function mapSearchItems(
  items: Awaited<ReturnType<typeof db.getMediaByIds>>,
  personNames: Map<number, string>,
): Promise<SearchResultItem[]> {
  const indexedIds = await db.getIndexedMediaIds();
  return Promise.all(
    items.map(async (item) => {
      const { hideFromGallery: _h, ...rest } = item;
      const personIds = await db.getImagePeople(rest.id);
      const people = personIds.map(
        (pid) => personNames.get(pid) ?? `Person ${pid}`,
      );
      return {
        ...rest,
        indexed: indexedIds.has(item.id),
        backedUp: !!rest.backedUpAt,
        people: people.length ? people : undefined,
      };
    }),
  );
}

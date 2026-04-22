import type {
  SearchIndexStatusResponse,
  SearchResultItem,
} from "../../../shared/src/api.js";
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
import { logger } from "../logger.js";
import { getSyncState, getS3Config } from "../s3/sync.js";
import type { ServiceFailure } from "./service-result.js";
import { normalizePersonHandle } from "../lib/search-query-normalize.js";
import {
  parseSearchQuery,
  type SearchQueryAst,
} from "../lib/search-query-parser.js";

export function getIndexStatusBody(): SearchIndexStatusResponse {
  const snap = buildActivitySnapshot(
    getIndexJobState(),
    getSyncState(),
    getS3Config(),
  );
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

export function clearAllSearchIndexData(): void {
  db.clearAllIndexingData();
}

export type StartBulkIndexingJobResult =
  | { ok: true; jobId: string }
  | ServiceFailure<"index_in_progress">;

export function startBulkIndexingJob(params: {
  force: boolean;
  mediaIds?: string[];
}): StartBulkIndexingJobResult {
  const started = startIndexJob();
  if (!started.ok) return { ok: false, reason: "index_in_progress" };

  const allItems = db.listMedia();
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

function resolvePersonIdForHandle(handle: string): number | null {
  const personNames = db.getPersonNames();
  const matching = [...personNames.entries()].filter(
    ([, name]) => normalizePersonHandle(name) === handle,
  );
  if (matching.length === 0) {
    return null;
  }
  return Math.min(...matching.map(([id]) => id));
}

async function textSearchOrderedIds(text: string): Promise<string[]> {
  const stored = db.getEmbeddings();
  if (stored.length === 0 || !text.trim()) {
    return [];
  }
  const queryEmbedding = await getEmbedding(text.trim());
  const scored = stored.map(({ mediaId, embedding }) => ({
    mediaId,
    score: cosineSimilarity(queryEmbedding, JSON.parse(embedding) as number[]),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, EMBEDDING_TOP).map((s) => s.mediaId);
}

/**
 * Legacy: substring match on person names + embedding over full query (unchanged behavior
 * for queries without # @ AND OR parentheses).
 */
async function legacySearchOrderedIds(query: string): Promise<string[]> {
  const queryLower = query.toLowerCase();
  const personNames = db.getPersonNames();
  const matchingPersonIds = [...personNames.entries()]
    .filter(([, name]) => name.toLowerCase().includes(queryLower))
    .map(([id]) => id)
    .sort((a, b) => a - b);
  const mediaIds: string[] = [];
  const seen = new Set<string>();
  for (const personId of matchingPersonIds) {
    const media = db.getMediaForPerson(personId, 10000);
    for (const m of media) {
      if (!seen.has(m.id)) {
        mediaIds.push(m.id);
        seen.add(m.id);
      }
    }
  }
  const stored = db.getEmbeddings();
  if (stored.length > 0) {
    const queryEmbedding = await getEmbedding(query);
    const scored = stored.map(({ mediaId, embedding }) => ({
      mediaId,
      score: cosineSimilarity(
        queryEmbedding,
        JSON.parse(embedding) as number[],
      ),
    }));
    scored.sort((a, b) => b.score - a.score);
    for (const id of scored.slice(0, EMBEDDING_TOP).map((s) => s.mediaId)) {
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
    case "legacy":
      return legacySearchOrderedIds(ast.text);
    case "tag":
      return db.getMediaIdsForTag(ast.tag);
    case "person": {
      const personId = resolvePersonIdForHandle(ast.handle);
      if (personId == null) {
        return [];
      }
      return db.getMediaForPerson(personId, 10000).map((m) => m.id);
    }
    case "text":
      return textSearchOrderedIds(ast.text);
    case "not": {
      const universe = db.listVisibleGalleryMediaIds();
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

export type SearchMediaByQueryResult =
  | { ok: true; items: SearchResultItem[] }
  | ServiceFailure<"missing_query">
  | { ok: false; reason: "invalid_query"; message: string }
  | { ok: false; reason: "search_failed"; message: string };

export async function searchMediaByQuery(
  q: string,
): Promise<SearchMediaByQueryResult> {
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
    if (mediaIds.length === 0) {
      return { ok: true, items: [] };
    }

    const personNames = db.getPersonNames();
    const items = db
      .getMediaByIds(mediaIds)
      .filter((x) => (x.hideFromGallery ?? 0) === 0);
    const order = new Map(mediaIds.map((id, i) => [id, i]));
    items.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));

    return { ok: true, items: mapSearchItems(items, personNames) };
  } catch (err) {
    logger.error({ err }, "Search error");
    const message = err instanceof Error ? err.message : "Search failed";
    return { ok: false, reason: "search_failed", message };
  }
}

function mapSearchItems(
  items: ReturnType<typeof db.getMediaByIds>,
  personNames: Map<number, string>,
): SearchResultItem[] {
  const indexedIds = db.getIndexedMediaIds();
  return items.map((item) => {
    const { hideFromGallery: _h, ...rest } = item;
    const personIds = db.getImagePeople(rest.id);
    const people = personIds.map(
      (pid) => personNames.get(pid) ?? `Person ${pid}`,
    );
    return {
      ...rest,
      indexed: indexedIds.has(item.id),
      backedUp: !!rest.backedUpAt,
      people: people.length ? people : undefined,
    };
  });
}

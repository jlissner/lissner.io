import type { SearchIndexStatusResponse, SearchResultItem } from "../../../shared/src/api.js";
import * as db from "../db/media.js";
import { HttpError } from "../lib/http-error.js";
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

export function getIndexStatusBody(): SearchIndexStatusResponse {
  const snap = buildActivitySnapshot(getIndexJobState(), getSyncState(), getS3Config());
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

/**
 * Starts a bulk index job (async). Returns `{ ok: false }` if a job is already running.
 * On success, schedules indexing and updates job-store on completion.
 */
export function startBulkIndexingJob(params: {
  force: boolean;
  mediaIds?: string[];
}): { ok: false } | { ok: true; jobId: string } {
  const started = startIndexJob();
  if (!started.ok) return { ok: false };

  const allItems = db.listMedia();
  const items =
    Array.isArray(params.mediaIds) && params.mediaIds.length > 0
      ? allItems.filter((i) => params.mediaIds!.includes(i.id))
      : allItems;

  void indexMediaItems(items, { skipIndexed: !params.force, signal: started.signal })
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

export async function searchMediaByQuery(q: string): Promise<SearchResultItem[]> {
  const query = q.trim();
  if (!query) {
    throw new HttpError(400, "Missing query parameter: q", "missing_query");
  }

  try {
    const personNames = db.getPersonNames();
    const queryLower = query.toLowerCase();
    const matchingPersonIds = Array.from(personNames.entries())
      .filter(([, name]) => name.toLowerCase().includes(queryLower))
      .map(([id]) => id);

    const mediaIds: string[] = [];
    if (matchingPersonIds.length > 0) {
      const personMediaIds = new Set<string>();
      for (const personId of matchingPersonIds) {
        const media = db.getMediaForPerson(personId, 100);
        for (const m of media) personMediaIds.add(m.id);
      }
      mediaIds.push(...personMediaIds);
    }

    const stored = db.getEmbeddings();
    if (stored.length > 0) {
      const queryEmbedding = await getEmbedding(query);
      const scored = stored.map(({ mediaId, embedding }) => ({
        mediaId,
        score: cosineSimilarity(queryEmbedding, JSON.parse(embedding) as number[]),
      }));
      scored.sort((a, b) => b.score - a.score);
      const topFromEmbedding = scored.slice(0, 20).map((s) => s.mediaId);
      const seen = new Set(mediaIds);
      for (const id of topFromEmbedding) {
        if (!seen.has(id)) {
          mediaIds.push(id);
          seen.add(id);
        }
      }
    }

    if (mediaIds.length === 0) {
      return [];
    }

    const items = db.getMediaByIds(mediaIds);
    const order = new Map(mediaIds.map((id, i) => [id, i]));
    items.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));

    return mapSearchItems(items, personNames);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    logger.error({ err }, "Search error");
    throw new HttpError(
      500,
      err instanceof Error ? err.message : "Search failed",
      "search_failed"
    );
  }
}

function mapSearchItems(
  items: ReturnType<typeof db.getMediaByIds>,
  personNames: Map<number, string>
): SearchResultItem[] {
  return items.map((item) => {
    const personIds = db.getImagePeople(item.id);
    const people = personIds.map((pid) => personNames.get(pid) ?? `Person ${pid}`);
    return {
      ...item,
      indexed: true,
      backedUp: !!item.backedUpAt,
      people: people.length ? people : undefined,
    };
  });
}

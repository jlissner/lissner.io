import type { SearchIndexStatusResponse, SearchResultItem } from "../../../shared/src/api.js";
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
 * Starts a bulk index job (async). Returns `already_running` if a job is in progress.
 * On success, schedules indexing and updates job-store on completion.
 */
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

export type SearchMediaByQueryResult =
  | { ok: true; items: SearchResultItem[] }
  | ServiceFailure<"missing_query">
  | { ok: false; reason: "search_failed"; message: string };

export async function searchMediaByQuery(q: string): Promise<SearchMediaByQueryResult> {
  const query = q.trim();
  if (!query) {
    return { ok: false, reason: "missing_query" };
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
      return { ok: true, items: [] };
    }

    const items = db.getMediaByIds(mediaIds).filter((x) => (x.hideFromGallery ?? 0) === 0);
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
  personNames: Map<number, string>
): SearchResultItem[] {
  return items.map((item) => {
    const { hideFromGallery: _h, ...rest } = item;
    const personIds = db.getImagePeople(rest.id);
    const people = personIds.map((pid) => personNames.get(pid) ?? `Person ${pid}`);
    return {
      ...rest,
      indexed: true,
      backedUp: !!rest.backedUpAt,
      people: people.length ? people : undefined,
    };
  });
}

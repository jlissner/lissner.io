import { Router } from "express";
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
import { getSyncState, getS3Config } from "../s3/sync.js";

export const searchRouter = Router();

searchRouter.post("/index", (req, res) => {
  const force = req.query.force === "true";
  const mediaIds = req.body?.mediaIds as string[] | undefined;
  if (!startIndexJob()) {
    res.status(409).json({ error: "Indexing already in progress" });
    return;
  }
  res.json({ started: true });

  const allItems = db.listMedia();
  const items =
    Array.isArray(mediaIds) && mediaIds.length > 0
      ? allItems.filter((i) => mediaIds.includes(i.id))
      : allItems;

  indexMediaItems(items, { skipIndexed: !force })
    .then(({ indexed, skipped }) => {
      finishIndexJob({ indexed, skipped, total: items.length });
    })
    .catch((err) => {
      console.error("Index error:", err);
      failIndexJob(err instanceof Error ? err.message : "Indexing failed");
    });
});

searchRouter.post("/index/clear", (_req, res) => {
  db.clearAllIndexingData();
  res.json({ cleared: true });
});

searchRouter.get("/index/status", (_req, res) => {
  const snap = buildActivitySnapshot(getIndexJobState(), getSyncState(), getS3Config());
  const s = snap.index;
  res.json({
    inProgress: s.inProgress,
    startedAt: s.startedAt,
    elapsedSeconds: s.elapsedSeconds,
    progressProcessed: s.progressProcessed,
    progressTotal: s.progressTotal,
    lastResult: s.lastResult,
    lastError: s.lastError,
  });
});

searchRouter.get("/", async (req, res) => {
  const q = req.query.q as string;
  if (!q?.trim()) {
    res.status(400).json({ error: "Missing query parameter: q" });
    return;
  }

  try {
    const personNames = db.getPersonNames();
    const queryLower = q.trim().toLowerCase();
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
      const queryEmbedding = await getEmbedding(q);
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
      res.json([]);
      return;
    }

    const items = db.getMediaByIds(mediaIds);
    const order = new Map(mediaIds.map((id, i) => [id, i]));
    items.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));

    res.json(
      items.map((item) => {
        const personIds = db.getImagePeople(item.id);
        const people = personIds.map((pid) => personNames.get(pid) ?? `Person ${pid}`);
        return {
          ...item,
          indexed: true,
          backedUp: !!item.backedUpAt,
          people: people.length ? people : undefined,
        };
      })
    );
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Search failed",
    });
  }
});

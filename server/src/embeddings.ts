import { OLLAMA_HOST } from "./config/env.js";

const OLLAMA_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

const embedWarnState = {
  missingModel: false,
  unreachable: false,
  httpOther: false,
  badBody: false,
};

export async function getEmbedding(text: string): Promise<number[] | null> {
  if (process.env.BDD_STUB_EMBEDDINGS === "1") {
    return new Array(768).fill(0.01);
  }

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: text }),
    });
  } catch (err) {
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? err.cause.message
        : err instanceof Error
          ? err.message
          : String(err);
    if (!embedWarnState.unreachable) {
      embedWarnState.unreachable = true;
      console.warn(
        `Embeddings skipped (could not reach Ollama at ${OLLAMA_HOST}): ${cause}`,
      );
    }
    return null;
  }

  if (!res.ok) {
    const errBody = await res.text();
    let errMessage = errBody;
    try {
      const parsed = JSON.parse(errBody) as { error?: string };
      if (typeof parsed.error === "string") {
        errMessage = parsed.error;
      }
    } catch {
      // use raw body
    }
    const modelMissing =
      /\bmodel\b.*\bnot found\b/i.test(errMessage) ||
      /\bnot found\b/i.test(errMessage.toLowerCase());
    if (modelMissing) {
      if (!embedWarnState.missingModel) {
        embedWarnState.missingModel = true;
        console.warn(
          `Embeddings skipped — model '${OLLAMA_MODEL}' is not pulled on Ollama (${OLLAMA_HOST}). Run: ollama pull ${OLLAMA_MODEL}`,
        );
      }
    } else if (!embedWarnState.httpOther) {
      embedWarnState.httpOther = true;
      console.warn(
        `Embeddings skipped — Ollama HTTP ${res.status} at ${OLLAMA_HOST}: ${errMessage.slice(0, 400)}`,
      );
    }
    return null;
  }

  try {
    const data = (await res.json()) as { embedding?: unknown };
    if (!Array.isArray(data.embedding)) {
      if (!embedWarnState.badBody) {
        embedWarnState.badBody = true;
        console.warn(
          "Embeddings skipped — Ollama response did not include an embedding array",
        );
      }
      return null;
    }
    return data.embedding as number[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!embedWarnState.badBody) {
      embedWarnState.badBody = true;
      console.warn(
        `Embeddings skipped — could not parse Ollama JSON: ${msg.slice(0, 200)}`,
      );
    }
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  const sums = { dot: 0, normA: 0, normB: 0 };
  for (const [i, ai] of a.entries()) {
    const bi = b[i]!;
    sums.dot += ai * bi;
    sums.normA += ai * ai;
    sums.normB += bi * bi;
  }
  const denom = Math.sqrt(sums.normA) * Math.sqrt(sums.normB);
  return denom === 0 ? 0 : sums.dot / denom;
}

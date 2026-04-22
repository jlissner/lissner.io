import { OLLAMA_HOST } from "./config/env.js";

const OLLAMA_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `Ollama embedding failed. Run: ollama run nomic-embed-text. ${err}`,
    );
  }

  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
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

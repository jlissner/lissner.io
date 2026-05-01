import { readFile } from "fs/promises";
import { OLLAMA_HOST, OLLAMA_VISION_MODEL } from "./config/env.js";

export async function describeImage(imagePath: string): Promise<string> {
  if (process.env.BDD_STUB_VISION === "1") {
    return "bdd fixture image for search indexing";
  }
  const buffer = await readFile(imagePath);
  const base64 = buffer.toString("base64");

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_VISION_MODEL,
        prompt:
          "Describe this image in detail for search. Include: people, objects, places, colors, activities, mood, and any text visible.",
        images: [base64],
        stream: false,
      }),
    });
  } catch (err) {
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? err.cause.message
        : err instanceof Error
          ? err.message
          : String(err);
    console.warn(
      `Vision skipped (could not reach Ollama at ${OLLAMA_HOST}): ${cause}`,
    );
    return "";
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
    const lower = errMessage.toLowerCase();
    const modelMissing =
      /\bmodel\b.*\bnot found\b/i.test(errMessage) ||
      /\bnot found\b/i.test(lower);
    if (modelMissing) {
      console.warn(
        `Vision skipped — model '${OLLAMA_VISION_MODEL}' is not pulled on Ollama (${OLLAMA_HOST}). Run: ollama pull ${OLLAMA_VISION_MODEL}`,
      );
    } else {
      console.warn(
        `Vision skipped — Ollama HTTP ${res.status} at ${OLLAMA_HOST}: ${errMessage.slice(0, 400)}`,
      );
    }
    return "";
  }

  const data = (await res.json()) as { response: string };
  return data.response?.trim() ?? "";
}

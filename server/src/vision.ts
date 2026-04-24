import { readFile } from "fs/promises";
import { OLLAMA_HOST, OLLAMA_VISION_MODEL } from "./config/env.js";

export async function describeImage(imagePath: string): Promise<string> {
  const buffer = await readFile(imagePath);
  const base64 = buffer.toString("base64");

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `Vision model failed. Run: ollama pull ${OLLAMA_VISION_MODEL}. ${err}`,
    );
  }

  const data = (await res.json()) as { response: string };
  return data.response?.trim() ?? "";
}

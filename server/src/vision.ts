const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? "llava";

export async function describeImage(imagePath: string): Promise<string> {
  const { readFile } = await import("fs/promises");
  const buffer = await readFile(imagePath);
  const base64 = buffer.toString("base64");

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      prompt:
        "Describe this image in detail for search. Include: people, objects, places, colors, activities, mood, and any text visible.",
      images: [base64],
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vision model failed. Run: ollama pull ${VISION_MODEL}. ${err}`);
  }

  const data = (await res.json()) as { response: string };
  return data.response?.trim() ?? "";
}

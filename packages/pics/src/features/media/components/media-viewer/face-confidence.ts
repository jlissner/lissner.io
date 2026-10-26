/** Auto-tagged faces at or below this stored confidence show as low-confidence in the viewer. */
const LOW_AUTO_FACE_CONFIDENCE_UI = 0.72;

export function isLowConfidenceAutoTag(
  source: "auto" | "manual" | undefined,
  confidence: number | null | undefined,
): boolean {
  if (source === "manual") return false;
  const c = confidence ?? 0;
  return c < LOW_AUTO_FACE_CONFIDENCE_UI;
}

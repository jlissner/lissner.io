import { type DuplicateMatch } from "../api";

export type DuplicateDecision = "keep_left" | "keep_right" | "skip";

function rowKey(dup: DuplicateMatch): string {
  return `${dup.mediaId}:${dup.duplicateOfId}`;
}

function willDeleteId(
  dup: DuplicateMatch,
  decision: DuplicateDecision | undefined,
): string | null {
  if (decision === "keep_left") return dup.duplicateOfId;
  if (decision === "keep_right") return dup.mediaId;
  return null;
}

export function mediaIdsToDeleteFromDecisions(
  duplicates: readonly DuplicateMatch[],
  decisionsByKey: Readonly<Record<string, DuplicateDecision | undefined>>,
): string[] {
  const ids = duplicates
    .map((dup) => willDeleteId(dup, decisionsByKey[rowKey(dup)]))
    .filter((x): x is string => x != null);
  return Array.from(new Set(ids));
}

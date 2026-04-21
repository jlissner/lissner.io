import type { PersonSummary } from "../../../../../shared/src/api.js";

export const SEARCH_AUTOCOMPLETE_LIMIT = 12;

/** Aligns with server `normalizePersonHandle` for @ search tokens. */
export function personSearchHandle(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type ActiveSearchToken =
  | { kind: "tag"; at: number; end: number; prefix: string }
  | { kind: "person"; at: number; end: number; prefix: string };

/**
 * If the cursor is inside a #word or @word token (after the trigger), returns
 * token span and prefix being typed.
 */
export function parseActiveSearchToken(value: string, cursor: number): ActiveSearchToken | null {
  const before = value.slice(0, cursor);
  let i = before.length - 1;
  while (i >= 0 && /[a-zA-Z0-9_]/.test(before[i]!)) {
    i -= 1;
  }
  if (i < 0) {
    return null;
  }
  const trigger = before[i]!;
  if (trigger !== "#" && trigger !== "@") {
    return null;
  }
  if (i > 0) {
    const prev = before[i - 1]!;
    if (!/[\s(]/.test(prev)) {
      return null;
    }
  }
  const prefix = before.slice(i + 1);
  return {
    kind: trigger === "#" ? "tag" : "person",
    at: i,
    end: cursor,
    prefix,
  };
}

export function filterTagSuggestions(allTags: readonly string[], prefix: string): string[] {
  const p = prefix.trim().toLowerCase();
  const ranked = allTags
    .filter((t) => (p === "" ? true : t.startsWith(p)))
    .sort((a, b) => a.localeCompare(b));
  return ranked.slice(0, SEARCH_AUTOCOMPLETE_LIMIT);
}

export function filterPeopleSuggestions(
  people: readonly PersonSummary[],
  prefix: string
): PersonSummary[] {
  const p = prefix.trim().toLowerCase();
  const scored = people
    .map((person) => {
      const handle = personSearchHandle(person.name);
      const match =
        p === "" ? 1 : handle.startsWith(p) ? 3 : person.name.toLowerCase().includes(p) ? 2 : 0;
      return { person, match };
    })
    .filter((x) => x.match > 0)
    .sort((a, b) => {
      if (b.match !== a.match) return b.match - a.match;
      return a.person.name.localeCompare(b.person.name);
    })
    .slice(0, SEARCH_AUTOCOMPLETE_LIMIT)
    .map((x) => x.person);
  return scored;
}

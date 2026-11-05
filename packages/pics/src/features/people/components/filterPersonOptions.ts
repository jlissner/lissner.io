export type PersonOption = {
  id: number;
  name: string;
};

const byName = (a: PersonOption, b: PersonOption): number =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

const nameTokens = (name: string): string[] =>
  name.toLowerCase().split(/\s+/).filter(Boolean);

const tokenStartsWithQuery = (name: string, query: string): boolean =>
  nameTokens(name).some((token) => token.startsWith(query));

const matchRank = (name: string, query: string): number => {
  if (!query) return 1;
  if (tokenStartsWithQuery(name, query)) return 2;
  if (name.toLowerCase().includes(query)) return 1;
  return 0;
};

/** Filter people by query: name-token prefix first, then alphabetical. */
export function filterPersonOptions(
  people: readonly PersonOption[],
  query: string,
  excludeIds: readonly number[] = [],
): PersonOption[] {
  const exclude = new Set(excludeIds);
  const lower = query.toLowerCase();
  return [...people]
    .filter((p) => !exclude.has(p.id))
    .map((person) => ({ person, rank: matchRank(person.name, lower) }))
    .filter((row) => row.rank > 0)
    .sort((a, b) =>
      b.rank !== a.rank ? b.rank - a.rank : byName(a.person, b.person),
    )
    .map((row) => row.person);
}

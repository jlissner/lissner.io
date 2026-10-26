/** Normalized tag for DB storage and lookup (leading # stripped, lowercased). */
export function normalizeTagToken(raw: string): string {
  const withoutHash = raw.startsWith("#") ? raw.slice(1) : raw;
  return withoutHash.trim().toLowerCase();
}

/** Match @handle against person display names (lowercase, alphanumeric only). */
export function normalizePersonHandle(raw: string): string {
  const withoutAt = raw.startsWith("@") ? raw.slice(1) : raw;
  return withoutAt.toLowerCase().replace(/[^a-z0-9]/g, "");
}

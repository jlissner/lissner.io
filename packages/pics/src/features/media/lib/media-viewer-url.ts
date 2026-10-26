export const MEDIA_URL_QUERY_KEY = "media";

export function parseMediaIdFromSearchString(search: string): string | null {
  const trimmed = search.startsWith("?") ? search.slice(1) : search;
  const id = new URLSearchParams(trimmed).get(MEDIA_URL_QUERY_KEY);
  return id != null && id !== "" ? id : null;
}

import { MEDIA_URL_QUERY_KEY } from "./media-viewer-url";

export const GALLERY_QUERY_KEY = "q";
export const GALLERY_SORT_KEY = "sort";
export const GALLERY_PERSON_KEY = "person";

export type GallerySortBy = "uploaded" | "taken";

export type GalleryUrlState = {
  q: string | null;
  sortBy: GallerySortBy;
  personId: number | null;
};

const GALLERY_PARAM_KEYS = [
  GALLERY_QUERY_KEY,
  GALLERY_SORT_KEY,
  GALLERY_PERSON_KEY,
] as const;

function normalizeSearch(search: string): string {
  return search.startsWith("?") ? search.slice(1) : search;
}

export function parseGalleryUrlState(search: string): GalleryUrlState {
  const params = new URLSearchParams(normalizeSearch(search));
  const qRaw = params.get(GALLERY_QUERY_KEY);
  const q = qRaw != null && qRaw.trim() !== "" ? qRaw.trim() : null;
  const sortRaw = params.get(GALLERY_SORT_KEY);
  const sortBy: GallerySortBy = sortRaw === "uploaded" ? "uploaded" : "taken";
  const personRaw = params.get(GALLERY_PERSON_KEY);
  const personId =
    personRaw != null && /^\d+$/.test(personRaw) ? Number(personRaw) : null;
  return { q, sortBy, personId };
}

export function gallerySearchStringFromParams(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const key of GALLERY_PARAM_KEYS) {
    const value = params.get(key);
    if (value != null && value !== "") {
      out.set(key, value);
    }
  }
  return out.toString();
}

export function applyGalleryUrlState(
  state: GalleryUrlState,
  mode: "replace" | "push" = "replace",
): void {
  const params = new URLSearchParams(window.location.search);

  if (state.q != null && state.q !== "") {
    params.set(GALLERY_QUERY_KEY, state.q);
  } else {
    params.delete(GALLERY_QUERY_KEY);
  }

  if (state.sortBy === "uploaded") {
    params.set(GALLERY_SORT_KEY, "uploaded");
  } else {
    params.delete(GALLERY_SORT_KEY);
  }

  if (state.personId != null) {
    params.set(GALLERY_PERSON_KEY, String(state.personId));
  } else {
    params.delete(GALLERY_PERSON_KEY);
  }

  const path = window.location.pathname;
  const qs = params.toString();
  const full = qs === "" ? path : `${path}?${qs}`;
  const current = window.location.pathname + window.location.search;
  if (full === current) {
    return;
  }

  if (mode === "push") {
    window.history.pushState({}, "", full);
  } else {
    window.history.replaceState({}, "", full);
  }
}

export function readGalleryUrlState(): GalleryUrlState {
  return parseGalleryUrlState(window.location.search);
}

export function searchStringForPageNav(pageId: string): string | undefined {
  const params = new URLSearchParams(window.location.search);
  if (pageId !== "home") {
    params.delete(MEDIA_URL_QUERY_KEY);
  }
  const qs = params.toString();
  return qs === "" ? undefined : qs;
}

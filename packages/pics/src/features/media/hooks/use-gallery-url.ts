import { useCallback, useEffect, useState } from "react";
import {
  applyGalleryUrlState,
  readGalleryUrlState,
  type GallerySortBy,
  type GalleryUrlState,
} from "../lib/gallery-url";

type GalleryUrlPatch = Partial<{
  q: string | null;
  sortBy: GallerySortBy;
  personId: number | null;
}>;

function normalizePatch(patch: GalleryUrlPatch): GalleryUrlPatch {
  if (!("q" in patch)) {
    return patch;
  }
  const trimmed = patch.q?.trim() ?? "";
  return { ...patch, q: trimmed === "" ? null : trimmed };
}

export function useGalleryUrlState(): {
  q: string | null;
  sortBy: GallerySortBy;
  personId: number | null;
  setQ: (q: string | null) => void;
  setSortBy: (sortBy: GallerySortBy) => void;
  setPersonId: (personId: number | null) => void;
} {
  const [state, setState] = useState<GalleryUrlState>(readGalleryUrlState);

  useEffect(() => {
    const sync = (): void => {
      setState(readGalleryUrlState());
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const patch = useCallback((rawPatch: GalleryUrlPatch) => {
    const current = readGalleryUrlState();
    const patchNorm = normalizePatch(rawPatch);
    const next: GalleryUrlState = {
      q: patchNorm.q !== undefined ? (patchNorm.q ?? null) : current.q,
      sortBy: patchNorm.sortBy ?? current.sortBy,
      personId:
        patchNorm.personId !== undefined
          ? patchNorm.personId
          : current.personId,
    };
    applyGalleryUrlState(next);
    setState(next);
  }, []);

  const setQ = useCallback(
    (q: string | null) => {
      patch({ q });
    },
    [patch],
  );

  const setSortBy = useCallback(
    (sortBy: GallerySortBy) => {
      patch({ sortBy });
    },
    [patch],
  );

  const setPersonId = useCallback(
    (personId: number | null) => {
      patch({ personId });
    },
    [patch],
  );

  return {
    q: state.q,
    sortBy: state.sortBy,
    personId: state.personId,
    setQ,
    setSortBy,
    setPersonId,
  };
}

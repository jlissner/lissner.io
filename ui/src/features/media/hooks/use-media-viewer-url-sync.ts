import { useCallback, useEffect, useRef, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getMediaDetails } from "../api";
import {
  MEDIA_URL_QUERY_KEY,
  parseMediaIdFromSearchString,
} from "../lib/media-viewer-url";
import type { MediaItem } from "../components/media-viewer/media-utils";

function currentQueryString(): string {
  const raw = window.location.search;
  return raw.startsWith("?") ? raw.slice(1) : raw;
}

function mediaIdFromWindowLocation(): string | null {
  return parseMediaIdFromSearchString(window.location.search);
}

function removeMediaParamFromUrl(): void {
  const params = new URLSearchParams(currentQueryString());
  params.delete(MEDIA_URL_QUERY_KEY);
  const path = window.location.pathname;
  const qs = params.toString();
  const full = qs === "" ? path : `${path}?${qs}`;
  window.history.replaceState({}, "", full);
}

interface UseMediaViewerUrlSyncArgs {
  viewing: MediaItem | null;
  setViewing: Dispatch<SetStateAction<MediaItem | null>>;
  items: MediaItem[];
}

export function useMediaViewerUrlSync({
  viewing,
  setViewing,
  items,
}: UseMediaViewerUrlSyncArgs): { dismissViewing: () => void } {
  const skipNextUrlWrite = useRef(false);
  const viewingIdRef = useRef<string | null>(null);
  const viewerExplicitDismissRef = useRef(false);

  useEffect(() => {
    viewingIdRef.current = viewing?.id ?? null;
  }, [viewing?.id]);

  useEffect(() => {
    if (skipNextUrlWrite.current) {
      skipNextUrlWrite.current = false;
      return;
    }
    const params = new URLSearchParams(currentQueryString());
    const prevMedia = params.get(MEDIA_URL_QUERY_KEY);
    const nextId = viewing?.id ?? null;

    if (nextId != null && prevMedia === nextId) {
      return;
    }
    if (nextId == null && (prevMedia == null || prevMedia === "")) {
      return;
    }

    if (nextId != null) {
      viewerExplicitDismissRef.current = false;
      params.set(MEDIA_URL_QUERY_KEY, nextId);
    } else {
      if (!viewerExplicitDismissRef.current) {
        return;
      }
      viewerExplicitDismissRef.current = false;
      params.delete(MEDIA_URL_QUERY_KEY);
    }
    const path = window.location.pathname;
    const qs = params.toString();
    const full = qs === "" ? path : `${path}?${qs}`;
    const currentFull = window.location.pathname + window.location.search;
    if (full === currentFull) return;

    const openingFirstTime =
      nextId != null && (prevMedia == null || prevMedia === "");
    if (openingFirstTime) {
      window.history.pushState({}, "", full);
    } else {
      window.history.replaceState({}, "", full);
    }
  }, [viewing]);

  const syncFromUrl = useCallback(
    (clearWhenMissing: boolean) => {
      const urlId = mediaIdFromWindowLocation();
      if (urlId == null) {
        if (clearWhenMissing) setViewing(null);
        return;
      }
      const found = items.find((i) => i.id === urlId);
      if (found) {
        skipNextUrlWrite.current = true;
        setViewing(found);
        return;
      }
      if (viewingIdRef.current === urlId) return;
      void getMediaDetails(urlId)
        .then((details) => {
          if (mediaIdFromWindowLocation() !== urlId) return;
          skipNextUrlWrite.current = true;
          setViewing(details);
        })
        .catch((err) => {
          console.error({ err, urlId }, "Deep-link media details fetch failed");
          if (mediaIdFromWindowLocation() !== urlId) return;
          removeMediaParamFromUrl();
          setViewing(null);
        });
    },
    [items, setViewing],
  );

  useEffect(() => {
    syncFromUrl(false);
  }, [syncFromUrl]);

  useEffect(() => {
    const onPop = () => {
      syncFromUrl(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [syncFromUrl]);

  const dismissViewing = useCallback(() => {
    viewerExplicitDismissRef.current = true;
    setViewing(null);
  }, [setViewing]);

  return useMemo(() => ({ dismissViewing }), [dismissViewing]);
}

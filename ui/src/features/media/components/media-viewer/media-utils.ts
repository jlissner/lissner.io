import { localCalendarDateKeyFromIso } from "@/lib/local-datetime.js";
import { prependApiUrl } from "@/api";
import { MediaListItem } from "@shared";

export {
  isImage,
  isPdf,
  isPixelMotionPhotoBasename,
  isText,
  isVideo,
} from "./media-type-checks";

export type MediaItem = MediaListItem;

export function mediaThumbnailUrl(item: { id: string; size: number }): string {
  return prependApiUrl(
    `/media/${item.id}/thumbnail?v=${encodeURIComponent(String(item.size))}`,
  );
}

export function mediaContentUrls(
  id: string,
  previewRev: number,
): { preview: string; full: string } {
  const cacheBust = previewRev > 0 ? `?r=${previewRev}` : "";
  return {
    preview: prependApiUrl(`/media/${id}/preview${cacheBust}`),
    full: prependApiUrl(`/media/${id}${cacheBust}`),
  };
}

function getItemDateKeyForSort(
  item: MediaItem,
  sortBy: "uploaded" | "taken",
): string {
  const dateStr =
    sortBy === "uploaded"
      ? item.uploadedAt
      : (item.dateTaken ?? item.uploadedAt);
  return localCalendarDateKeyFromIso(dateStr);
}

function formatDateLabel(dateKey: string): string {
  if (dateKey === "unknown") return "Unknown date";
  // Interpret YYYY-MM-DD as a local calendar day (noon avoids DST midnight quirks).
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function groupItemsByDay(
  items: MediaItem[],
  sortBy: "uploaded" | "taken" = "taken",
): Array<{ dateKey: string; dateLabel: string; items: MediaItem[] }> {
  const map = items.reduce((acc, item) => {
    const key = getItemDateKeyForSort(item, sortBy);
    const current = acc.get(key) ?? [];
    acc.set(key, [...current, item]);
    return acc;
  }, new Map<string, MediaItem[]>());
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return b.localeCompare(a);
  });
  return keys.map((dateKey) => ({
    dateKey,
    dateLabel: formatDateLabel(dateKey),
    items: map.get(dateKey)!,
  }));
}

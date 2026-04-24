import { localCalendarDateKeyFromIso } from "@/lib/local-datetime.js";
import { isImageMime, isTextMime, isVideoMime } from "../../lib/media-mime.js";
import { MediaListItem } from "@shared";

export type MediaItem = MediaListItem;

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

/** Pixel motion-photo sidecars often use `.mp`; payload may be JPEG or MP4. */
export function isPixelMotionPhotoBasename(originalName: string): boolean {
  const base = originalName.replace(/^.*[/\\]/, "");
  return /\.mp$/i.test(base);
}

export function isImage(mimeType: string, originalName?: string): boolean {
  if (isImageMime(mimeType)) return true;
  if (
    originalName != null &&
    originalName !== "" &&
    isPixelMotionPhotoBasename(originalName)
  ) {
    return true;
  }
  return false;
}

export function isVideo(mimeType: string): boolean {
  return isVideoMime(mimeType);
}

export function isText(mimeType: string): boolean {
  return isTextMime(mimeType);
}

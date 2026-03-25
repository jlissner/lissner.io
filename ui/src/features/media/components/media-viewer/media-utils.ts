export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dateTaken?: string | null;
  indexed?: boolean;
  backedUp?: boolean;
  people?: string[];
  /** Still row in a Pixel pair; companion id is the `*.mp` motion file. */
  motionCompanionId?: string | null;
}

export function getItemDateKey(item: MediaItem): string {
  const dateStr = item.dateTaken ?? item.uploadedAt;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "unknown" : d.toISOString().slice(0, 10);
}

export function getItemDateKeyForSort(item: MediaItem, sortBy: "uploaded" | "taken"): string {
  const dateStr = sortBy === "uploaded" ? item.uploadedAt : (item.dateTaken ?? item.uploadedAt);
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "unknown" : d.toISOString().slice(0, 10);
}

export function formatDateLabel(dateKey: string): string {
  if (dateKey === "unknown") return "Unknown date";
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function groupItemsByDay(
  items: MediaItem[],
  sortBy: "uploaded" | "taken" = "taken"
): Array<{ dateKey: string; dateLabel: string; items: MediaItem[] }> {
  const map = new Map<string, MediaItem[]>();
  for (const item of items) {
    const key = getItemDateKeyForSort(item, sortBy);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
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
  if (mimeType.startsWith("image/")) return true;
  if (originalName != null && originalName !== "" && isPixelMotionPhotoBasename(originalName)) {
    return true;
  }
  return false;
}

export function isVideo(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

export function isText(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  );
}

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dateTaken?: string | null;
  indexed?: boolean;
  people?: string[];
}

export function getItemDateKey(item: MediaItem): string {
  const dateStr = item.dateTaken ?? item.uploadedAt;
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
  items: MediaItem[]
): Array<{ dateKey: string; dateLabel: string; items: MediaItem[] }> {
  const map = new Map<string, MediaItem[]>();
  for (const item of items) {
    const key = getItemDateKey(item);
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

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
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

export function isViewable(mimeType: string): boolean {
  return isImage(mimeType) || isVideo(mimeType) || isText(mimeType);
}

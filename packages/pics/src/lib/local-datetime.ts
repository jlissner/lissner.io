/**
 * Format an ISO instant for display in the browser's local timezone.
 */
export function formatLocalDateTimeMediumShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Calendar date YYYY-MM-DD in the local timezone (for grouping / sort keys).
 */
export function localCalendarDateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

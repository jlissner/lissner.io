export function formatBytes(bytes: number): string {
  const steps = [
    { threshold: 1024 ** 4, label: "TB" },
    { threshold: 1024 ** 3, label: "GB" },
    { threshold: 1024 ** 2, label: "MB" },
    { threshold: 1024, label: "KB" },
  ];
  const match = steps.find((s) => bytes >= s.threshold);
  if (!match) return `${bytes} B`;
  const value = bytes / match.threshold;
  const rounded =
    value >= 10 || value % 1 < 0.05
      ? String(Math.round(value))
      : value.toFixed(1);
  return `${rounded} ${match.label}`;
}

export function formatBackupDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function fileIssueCodeLabel(code: string): string {
  if (code === "ffprobe_failed") {
    return "Video unreadable (ffprobe)";
  }
  if (code === "ffprobe_bad_response") {
    return "Invalid video metadata response";
  }
  if (code === "file_missing") {
    return "File not on disk";
  }
  return code;
}

export function sortDbBackupsByNewest<T extends { lastModified: string }>(
  backups: readonly T[],
): T[] {
  return [...backups].sort(
    (a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
  );
}

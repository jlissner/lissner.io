import { UploadNameConflict } from "@shared";

export type DuplicateConflictDecision = "skip" | "upload" | null;

export function formatUploadBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Pair each name conflict with the next matching pending file (same order as the upload check). */
export function pairConflictsWithFiles(
  pendingFiles: File[],
  conflicts: UploadNameConflict[],
): (File | undefined)[] {
  const queues = pendingFiles.reduce((acc, file) => {
    const current = acc.get(file.name) ?? [];
    acc.set(file.name, [...current, file]);
    return acc;
  }, new Map<string, File[]>());
  return conflicts.map((c) => {
    const queue = queues.get(c.requestedName) ?? [];
    const [head, ...rest] = queue;
    queues.set(c.requestedName, rest);
    return head;
  });
}

/** Pending files minus those the user marked as duplicate (skip upload). */
export function getFilesToUploadAfterDecisions(
  pendingFiles: File[],
  conflicts: UploadNameConflict[],
  decisions: DuplicateConflictDecision[],
): File[] {
  const paired = pairConflictsWithFiles(pendingFiles, conflicts);
  const skip = new Set<File>();
  for (const [i, d] of decisions.entries()) {
    if (d === "skip" && paired[i]) skip.add(paired[i]!);
  }
  return pendingFiles.filter((f) => !skip.has(f));
}

export type UploadFileRow =
  | { file: File; kind: "ready" }
  | {
      file: File;
      kind: "conflict";
      conflictIndex: number;
      conflict: UploadNameConflict;
    };

export function buildUploadFileRows(
  pendingFiles: File[],
  conflicts: UploadNameConflict[],
): UploadFileRow[] {
  const paired = pairConflictsWithFiles(pendingFiles, conflicts);
  const conflictByFile = new Map<File, number>();
  paired.forEach((file, index) => {
    if (file != null) conflictByFile.set(file, index);
  });
  return pendingFiles.map((file) => {
    const conflictIndex = conflictByFile.get(file);
    if (conflictIndex == null) {
      return { file, kind: "ready" as const };
    }
    return {
      file,
      kind: "conflict" as const,
      conflictIndex,
      conflict: conflicts[conflictIndex]!,
    };
  });
}

export function allConflictChoicesMade(
  conflicts: UploadNameConflict[],
  decisions: DuplicateConflictDecision[],
): boolean {
  return (
    conflicts.length === 0 ||
    (decisions.length === conflicts.length && decisions.every((d) => d != null))
  );
}

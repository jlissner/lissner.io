import { Button } from "@/components/ui/button";
import { formatLocalDateTimeMediumShort } from "@/lib/local-datetime.js";
import { UploadNameConflict } from "@shared";
import type { MediaUploadProgress } from "../lib/post-media-upload-with-progress.js";
import { UploadProgressPanel } from "./upload-progress-panel.js";
import {
  allConflictChoicesMade,
  buildUploadFileRows,
  type DuplicateConflictDecision,
  formatUploadBytes,
  getFilesToUploadAfterDecisions,
} from "./upload-modal-utils.js";

interface UploadModalFileListProps {
  pendingFiles: File[];
  nameConflicts: UploadNameConflict[];
  conflictDecisions: DuplicateConflictDecision[];
  checkLoading: boolean;
  uploading: boolean;
  uploadProgress: MediaUploadProgress | null;
  error: string | null;
  onConflictDecisionChange: (
    index: number,
    choice: Exclude<DuplicateConflictDecision, null>,
  ) => void;
  onApplyAllDuplicateDecisions: (
    choice: Exclude<DuplicateConflictDecision, null>,
  ) => void;
}

function getUploadButtonLabel(params: {
  uploading: boolean;
  checkLoading: boolean;
  hasConflicts: boolean;
  choicesComplete: boolean;
  uploadCount: number | null;
}): string {
  if (params.uploading) return "Uploading…";
  if (params.checkLoading) return "Checking…";
  if (
    params.hasConflicts &&
    params.choicesComplete &&
    params.uploadCount === 0
  ) {
    return "Done";
  }
  return "Upload";
}

export function UploadModalFileList({
  pendingFiles,
  nameConflicts,
  conflictDecisions,
  checkLoading,
  uploading,
  uploadProgress,
  error,
  onConflictDecisionChange,
  onApplyAllDuplicateDecisions,
}: UploadModalFileListProps) {
  const totalBytes = pendingFiles.reduce((sum, f) => sum + f.size, 0);
  const rows = buildUploadFileRows(pendingFiles, nameConflicts);
  const hasConflicts = nameConflicts.length > 0;
  const choicesComplete = allConflictChoicesMade(
    nameConflicts,
    conflictDecisions,
  );
  const uploadCount =
    hasConflicts && choicesComplete
      ? getFilesToUploadAfterDecisions(
          pendingFiles,
          nameConflicts,
          conflictDecisions as ("skip" | "upload")[],
        ).length
      : hasConflicts
        ? null
        : pendingFiles.length;

  return (
    <div className="upload-modal-files">
      <p className="upload-modal-files__summary">
        <strong>{pendingFiles.length}</strong>{" "}
        {pendingFiles.length === 1 ? "file" : "files"} ·{" "}
        {formatUploadBytes(totalBytes)}
        {uploadCount != null && (
          <>
            {" "}
            · <strong>{uploadCount}</strong> to upload
          </>
        )}
      </p>

      {checkLoading && (
        <p className="upload-modal-files__status">
          Checking for duplicate names…
        </p>
      )}

      {!checkLoading && hasConflicts && (
        <div className="upload-modal-files__conflict-banner" role="status">
          <p className="upload-modal-files__conflict-title">
            {nameConflicts.length === 1
              ? "One file matches an existing name"
              : `${nameConflicts.length} files match existing names`}
          </p>
          {nameConflicts.length > 1 && (
            <div className="upload-modal-files__bulk">
              <button
                type="button"
                className="upload-modal-files__bulk-link"
                disabled={uploading}
                onClick={() => onApplyAllDuplicateDecisions("skip")}
              >
                Skip all
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                className="upload-modal-files__bulk-link"
                disabled={uploading}
                onClick={() => onApplyAllDuplicateDecisions("upload")}
              >
                Upload all as new
              </button>
            </div>
          )}
        </div>
      )}

      <ul className="upload-file-list">
        {rows.map((row) => {
          const decision =
            row.kind === "conflict"
              ? (conflictDecisions[row.conflictIndex] ?? null)
              : null;
          return (
            <li
              key={`${row.file.name}-${row.file.size}-${row.file.lastModified}`}
              className={
                row.kind === "conflict"
                  ? "upload-file-row upload-file-row--conflict"
                  : "upload-file-row"
              }
            >
              <div className="upload-file-row__main">
                <span className="upload-file-row__name" title={row.file.name}>
                  {row.file.name}
                </span>
                <span className="upload-file-row__meta">
                  {formatUploadBytes(row.file.size)}
                </span>
              </div>
              {row.kind === "conflict" && (
                <>
                  <p className="upload-file-row__conflict-note">
                    In library since{" "}
                    {formatLocalDateTimeMediumShort(
                      row.conflict.existing.uploadedAt,
                    )}
                  </p>
                  <div
                    className="upload-file-row__actions"
                    role="group"
                    aria-label={`Duplicate decision for ${row.file.name}`}
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant={decision === "skip" ? "primary" : "secondary"}
                      disabled={uploading}
                      onClick={() =>
                        onConflictDecisionChange(row.conflictIndex, "skip")
                      }
                    >
                      Skip
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={decision === "upload" ? "primary" : "secondary"}
                      disabled={uploading}
                      onClick={() =>
                        onConflictDecisionChange(row.conflictIndex, "upload")
                      }
                    >
                      Upload as new
                    </Button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {uploading &&
        (uploadProgress ? (
          <UploadProgressPanel progress={uploadProgress} />
        ) : (
          <p className="upload-modal-files__status" aria-live="polite">
            Preparing upload…
          </p>
        ))}

      {error && (
        <p className="upload-modal-files__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function getUploadActionLabel(params: {
  uploading: boolean;
  checkLoading: boolean;
  hasConflicts: boolean;
  choicesComplete: boolean;
  uploadCount: number | null;
}): string {
  return getUploadButtonLabel(params);
}

export function isUploadActionDisabled(params: {
  uploading: boolean;
  checkLoading: boolean;
  hasConflicts: boolean;
  choicesComplete: boolean;
}): boolean {
  return (
    params.uploading ||
    params.checkLoading ||
    (params.hasConflicts && !params.choicesComplete)
  );
}

export function computeUploadCount(params: {
  pendingFiles: File[];
  nameConflicts: UploadNameConflict[];
  conflictDecisions: DuplicateConflictDecision[];
  hasConflicts: boolean;
  choicesComplete: boolean;
}): number | null {
  if (!params.hasConflicts) return params.pendingFiles.length;
  if (!params.choicesComplete) return null;
  return getFilesToUploadAfterDecisions(
    params.pendingFiles,
    params.nameConflicts,
    params.conflictDecisions as ("skip" | "upload")[],
  ).length;
}

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { ModalActions } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { formatLocalDateTimeMediumShort } from "@/lib/local-datetime.js";
import { isImage, isVideo } from "./media-viewer/media-utils.js";
import type { UploadNameConflict } from "../upload-types.js";
import type { MediaUploadProgress } from "../lib/post-media-upload-with-progress.js";
import { UploadProgressPanel } from "./upload-progress-panel.js";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Pair each name conflict with the next matching pending file (same order as the upload check). */
export function pairConflictsWithFiles(
  pendingFiles: File[],
  conflicts: UploadNameConflict[]
): (File | undefined)[] {
  const queues = new Map<string, File[]>();
  for (const f of pendingFiles) {
    const q = queues.get(f.name) ?? [];
    q.push(f);
    queues.set(f.name, q);
  }
  return conflicts.map((c) => {
    const q = queues.get(c.requestedName);
    const file = q?.shift();
    return file;
  });
}

export type DuplicateConflictDecision = "skip" | "upload" | null;

/** Pending files minus those the user marked as duplicate (skip upload). */
export function getFilesToUploadAfterDecisions(
  pendingFiles: File[],
  conflicts: UploadNameConflict[],
  decisions: DuplicateConflictDecision[]
): File[] {
  const paired = pairConflictsWithFiles(pendingFiles, conflicts);
  const skip = new Set<File>();
  for (const [i, d] of decisions.entries()) {
    if (d === "skip" && paired[i]) skip.add(paired[i]!);
  }
  return pendingFiles.filter((f) => !skip.has(f));
}

const comparePaneStyle: CSSProperties = {
  overflow: "hidden",
  borderRadius: 8,
  border: "1px solid var(--color-border-subtle)",
  background: "var(--color-bg-elevated)",
};

function mediaFitStyle(maxHeight: number): CSSProperties {
  return {
    display: "block",
    width: "100%",
    maxHeight,
    objectFit: "contain",
  };
}

function LocalUploadPreview({ file, maxHeight }: { file: File; maxHeight: number }) {
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);
  const st = mediaFitStyle(maxHeight);
  if (isImage(file.type, file.name)) {
    return <img src={objectUrl} alt="" style={st} />;
  }
  if (isVideo(file.type)) {
    return (
      <video src={objectUrl} controls muted playsInline style={st}>
        {file.name}
      </video>
    );
  }
  return (
    <p className="u-text-muted u-text-sm u-m-0" style={{ padding: "0.75rem" }}>
      No preview
    </p>
  );
}

function LibraryItemPreview({
  id,
  originalName,
  maxHeight,
}: {
  id: string;
  originalName: string;
  maxHeight: number;
}) {
  const src = `/api/media/${id}/preview`;
  const [mode, setMode] = useState<"img" | "video" | "none">("img");
  const st = mediaFitStyle(maxHeight);
  if (mode === "img") {
    return (
      <img src={src} alt={originalName} style={st} onError={() => setMode("video")} />
    );
  }
  if (mode === "video") {
    return (
      <video src={src} controls muted playsInline style={st} onError={() => setMode("none")}>
        {originalName}
      </video>
    );
  }
  return (
    <p className="u-text-muted u-text-sm u-m-0" style={{ padding: "0.75rem" }}>
      No preview
    </p>
  );
}

function DuplicateChoiceButtons({
  decision,
  onChoice,
  disabled,
}: {
  decision: DuplicateConflictDecision;
  onChoice: (c: Exclude<DuplicateConflictDecision, null>) => void;
  disabled: boolean;
}) {
  return (
    <div className="upload-duplicate-actions" role="group" aria-label="Duplicate decision">
      <button
        type="button"
        disabled={disabled}
        className={cn("upload-duplicate-actions__btn", decision === "skip" && "is-selected")}
        onClick={() => onChoice("skip")}
      >
        <span className="upload-duplicate-actions__title">Skip upload</span>
        <span className="upload-duplicate-actions__hint">Same file — don’t add to library</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        className={cn("upload-duplicate-actions__btn", decision === "upload" && "is-selected")}
        onClick={() => onChoice("upload")}
      >
        <span className="upload-duplicate-actions__title">Upload as new</span>
        <span className="upload-duplicate-actions__hint">Different file — keep both</span>
      </button>
    </div>
  );
}

function DuplicateCompareBlock({
  localFile,
  conflict,
  decision,
  onChoice,
  uploading,
  previewMaxHeight,
}: {
  localFile: File | undefined;
  conflict: UploadNameConflict;
  decision: DuplicateConflictDecision;
  onChoice: (c: Exclude<DuplicateConflictDecision, null>) => void;
  uploading: boolean;
  previewMaxHeight: number;
}) {
  return (
    <div className="upload-duplicate-compare">
      <p className="upload-duplicate-filename u-text-sm u-font-medium u-mb-3" style={{ marginTop: 0 }}>
        {conflict.requestedName}
      </p>
      <div
        className="upload-duplicate-compare__grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          alignItems: "start",
        }}
      >
        <div>
          <p className="u-text-xs u-text-muted u-mb-1" style={{ marginTop: 0 }}>
            Your file
          </p>
          <div style={comparePaneStyle}>
            {localFile ? (
              <LocalUploadPreview file={localFile} maxHeight={previewMaxHeight} />
            ) : (
              <p className="u-text-muted u-text-sm u-m-0" style={{ padding: "0.75rem" }}>
                Could not match file.
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="u-text-xs u-text-muted u-mb-1" style={{ marginTop: 0 }}>
            In your library
          </p>
          <div style={comparePaneStyle}>
            <LibraryItemPreview
              id={conflict.existing.id}
              originalName={conflict.existing.originalName}
              maxHeight={previewMaxHeight}
            />
          </div>
          <p className="u-text-xs u-text-muted u-mt-1 u-mb-0">
            Added {formatLocalDateTimeMediumShort(conflict.existing.uploadedAt)}
          </p>
        </div>
      </div>
      <div className="u-mt-3">
        <DuplicateChoiceButtons decision={decision} onChoice={onChoice} disabled={uploading} />
      </div>
    </div>
  );
}

interface UploadModalConfirmProps {
  fileCount: number;
  totalBytes: number;
  pendingFiles: File[];
  uploading: boolean;
  uploadProgress: MediaUploadProgress | null;
  error: string | null;
  onChooseDifferent: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  nameConflicts: UploadNameConflict[];
  checkLoading: boolean;
  conflictDecisions: DuplicateConflictDecision[];
  onConflictDecisionChange: (index: number, choice: Exclude<DuplicateConflictDecision, null>) => void;
  onApplyAllDuplicateDecisions: (choice: Exclude<DuplicateConflictDecision, null>) => void;
  onResetDuplicateDecisions: () => void;
}

export function UploadModalConfirm({
  fileCount,
  totalBytes,
  pendingFiles,
  uploading,
  uploadProgress,
  error,
  onChooseDifferent,
  onCancel,
  onConfirm,
  nameConflicts,
  checkLoading,
  conflictDecisions,
  onConflictDecisionChange,
  onApplyAllDuplicateDecisions,
  onResetDuplicateDecisions,
}: UploadModalConfirmProps) {
  const conflictFiles = useMemo(
    () => pairConflictsWithFiles(pendingFiles, nameConflicts),
    [pendingFiles, nameConflicts]
  );
  const hasDuplicateNames = nameConflicts.length > 0;
  const multiDuplicates = nameConflicts.length > 1;
  const [wizardStep, setWizardStep] = useState(0);

  useEffect(() => {
    setWizardStep(0);
  }, [nameConflicts]);

  const allConflictChoicesMade =
    !hasDuplicateNames ||
    (conflictDecisions.length === nameConflicts.length &&
      conflictDecisions.every((d) => d != null));

  const uploadCountAfterChoices = useMemo(() => {
    if (!hasDuplicateNames || !allConflictChoicesMade) return null;
    return getFilesToUploadAfterDecisions(
      pendingFiles,
      nameConflicts,
      conflictDecisions as ("skip" | "upload")[]
    ).length;
  }, [hasDuplicateNames, allConflictChoicesMade, pendingFiles, nameConflicts, conflictDecisions]);

  const continueDisabled = uploading || checkLoading || !allConflictChoicesMade;

  const previewH = multiDuplicates ? 150 : 180;
  const safeStep = Math.min(wizardStep, Math.max(0, nameConflicts.length - 1));
  const stepConflict = hasDuplicateNames ? nameConflicts[safeStep] : null;
  const stepFile = hasDuplicateNames ? conflictFiles[safeStep] : undefined;
  const stepDecision = hasDuplicateNames ? (conflictDecisions[safeStep] ?? null) : null;

  const handleStepChoice = (choice: Exclude<DuplicateConflictDecision, null>) => {
    onConflictDecisionChange(safeStep, choice);
    if (multiDuplicates && safeStep < nameConflicts.length - 1) {
      setWizardStep(safeStep + 1);
    }
  };

  const showWizard = hasDuplicateNames && multiDuplicates && !checkLoading;
  const decidedCount = conflictDecisions.filter((d) => d != null).length;
  const skipCount = conflictDecisions.filter((d) => d === "skip").length;
  const uploadNewCount = conflictDecisions.filter((d) => d === "upload").length;
  const duplicatesResolved = hasDuplicateNames && allConflictChoicesMade && !checkLoading;

  return (
    <div className="upload-modal-confirm">
      <div className="upload-modal-confirm__scroll">
        <p className="u-mb-3 u-text-muted" style={{ marginTop: 0 }}>
          <strong>{fileCount}</strong> {fileCount === 1 ? "file" : "files"} · {formatBytes(totalBytes)}
          {uploadCountAfterChoices != null && (
            <>
              {" "}
              → <strong>{uploadCountAfterChoices}</strong> will upload
            </>
          )}
        </p>
        {checkLoading && (
          <p className="u-mb-3 u-text-muted u-text-sm">Checking for duplicate names…</p>
        )}
        {!checkLoading && hasDuplicateNames && (
          <div className="upload-duplicate-stack alert alert--warning" role="status">
            <p className="upload-duplicate-alert__title">
              {nameConflicts.length === 1
                ? "This name is already in your library"
                : `${nameConflicts.length} files match existing names`}
            </p>
            <p className="upload-duplicate-alert__body">
              Same original filename (case-insensitive). Compare previews, then skip or keep each upload.
            </p>
            {multiDuplicates && !duplicatesResolved && (
              <div className="upload-duplicate-bulk">
                <span className="upload-duplicate-bulk__label">Quick:</span>
                <button
                  type="button"
                  className="upload-duplicate-bulk__link"
                  disabled={uploading}
                  onClick={() => onApplyAllDuplicateDecisions("skip")}
                >
                  Skip all
                </button>
                <span className="upload-duplicate-bulk__sep" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  className="upload-duplicate-bulk__link"
                  disabled={uploading}
                  onClick={() => onApplyAllDuplicateDecisions("upload")}
                >
                  Upload all as new
                </button>
                {decidedCount > 0 && (
                  <>
                    <span className="upload-duplicate-bulk__sep" aria-hidden>
                      ·
                    </span>
                    <button
                      type="button"
                      className="upload-duplicate-bulk__link"
                      disabled={uploading}
                      onClick={() => {
                        onResetDuplicateDecisions();
                        setWizardStep(0);
                      }}
                    >
                      Clear choices
                    </button>
                  </>
                )}
              </div>
            )}
            {duplicatesResolved ? (
              multiDuplicates ? (
                <div className="upload-duplicate-summary">
                  <p className="upload-duplicate-summary__title">All duplicate names resolved</p>
                  <p className="upload-duplicate-summary__meta">
                    Skip {skipCount}
                    <span className="upload-duplicate-summary__sep" aria-hidden>
                      {" · "}
                    </span>
                    Upload as new {uploadNewCount}
                  </p>
                  <button
                    type="button"
                    className="upload-duplicate-bulk__link"
                    disabled={uploading}
                    onClick={() => {
                      onResetDuplicateDecisions();
                      setWizardStep(0);
                    }}
                  >
                    Change choices
                  </button>
                </div>
              ) : (
                <p className="upload-duplicate-single-done u-text-sm u-mb-0">
                  {conflictDecisions[0] === "skip"
                    ? "This upload will be skipped."
                    : "This file will be added as a new library item."}
                </p>
              )
            ) : showWizard ? (
              <div className="upload-duplicate-wizard">
                <div className="upload-duplicate-wizard__bar">
                  <button
                    type="button"
                    className="upload-duplicate-wizard__back"
                    disabled={uploading || safeStep === 0}
                    onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                  >
                    Back
                  </button>
                  <span className="upload-duplicate-wizard__progress">
                    {decidedCount}/{nameConflicts.length} · card {safeStep + 1}/{nameConflicts.length}
                  </span>
                </div>
                {stepConflict && (
                  <DuplicateCompareBlock
                    key={`${stepConflict.requestedName}-${stepConflict.existing.id}-${safeStep}`}
                    localFile={stepFile}
                    conflict={stepConflict}
                    decision={stepDecision}
                    onChoice={handleStepChoice}
                    uploading={uploading}
                    previewMaxHeight={previewH}
                  />
                )}
              </div>
            ) : (
              hasDuplicateNames &&
              stepConflict && (
                <DuplicateCompareBlock
                  localFile={stepFile}
                  conflict={stepConflict}
                  decision={stepDecision}
                  onChoice={(c) => onConflictDecisionChange(0, c)}
                  uploading={uploading}
                  previewMaxHeight={previewH}
                />
              )
            )}
          </div>
        )}
        {!uploading && !hasDuplicateNames && (
          <p className="u-mb-3 u-text-muted u-text-sm">Ready to upload when you continue.</p>
        )}
        {uploading &&
          (uploadProgress ? (
            <UploadProgressPanel progress={uploadProgress} />
          ) : (
            <p className="u-mb-3 u-text-muted u-text-sm" aria-live="polite">
              Preparing upload…
            </p>
          ))}
        {error && <p className="u-text-danger u-mb-3 u-text-sm">{error}</p>}
      </div>
      <div className="upload-modal-confirm__footer">
        <ModalActions className="upload-modal-confirm__actions">
          <Button variant="secondary" onClick={onChooseDifferent} disabled={uploading}>
            Different files
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={continueDisabled}>
            {uploading
              ? "Uploading…"
              : checkLoading
                ? "Loading…"
                : hasDuplicateNames && allConflictChoicesMade && uploadCountAfterChoices === 0
                  ? "Done"
                  : "Continue"}
          </Button>
        </ModalActions>
      </div>
    </div>
  );
}

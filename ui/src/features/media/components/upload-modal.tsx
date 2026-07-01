import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/api";
import { Button } from "@/components/ui/button";
import {
  ModalActions,
  ModalPanel,
  ModalRoot,
  ModalTitle,
} from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { MediaUploadProgress } from "../lib/post-media-upload-with-progress.js";
import { uploadMediaFilesWithProgress } from "../lib/upload-media-files-with-progress.js";
import {
  computeUploadCount,
  getUploadActionLabel,
  isUploadActionDisabled,
  UploadModalFileList,
} from "./upload-modal-file-list.js";
import {
  allConflictChoicesMade,
  type DuplicateConflictDecision,
  getFilesToUploadAfterDecisions,
} from "./upload-modal-utils.js";
import { UploadNameConflict } from "@shared";

interface UploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

export function UploadModal({ onClose, onUploadComplete }: UploadModalProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameConflicts, setNameConflicts] = useState<UploadNameConflict[]>([]);
  const [checkLoading, setCheckLoading] = useState(false);
  const [conflictDecisions, setConflictDecisions] = useState<
    DuplicateConflictDecision[]
  >([]);
  const [uploadProgress, setUploadProgress] =
    useState<MediaUploadProgress | null>(null);
  const uploadControlRef = useRef<{
    aborted: boolean;
    activeAbort: (() => void) | null;
  }>({ aborted: false, activeAbort: null });

  const createUploadController = useCallback(
    () => ({
      abort: () => {
        uploadControlRef.current.aborted = true;
        uploadControlRef.current.activeAbort?.();
      },
      isAborted: () => uploadControlRef.current.aborted,
      setActiveAbort: (abortFn: (() => void) | null) => {
        uploadControlRef.current.activeAbort = abortFn;
      },
    }),
    [],
  );

  const appendFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
    setError(null);
  }, []);

  const clearFiles = useCallback(() => {
    setPendingFiles([]);
    setError(null);
    setConflictDecisions([]);
    setNameConflicts([]);
  }, []);

  useEffect(() => {
    if (!pendingFiles.length) {
      setNameConflicts([]);
      setCheckLoading(false);
      return;
    }
    const names = pendingFiles.map((f) => f.name);
    const ac = new AbortController();
    setCheckLoading(true);
    void apiJson<{ conflicts?: UploadNameConflict[] }>(
      "/media/upload/check-names",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
        signal: ac.signal,
      },
    )
      .then((data) => {
        setNameConflicts(Array.isArray(data.conflicts) ? data.conflicts : []);
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        console.error({ err }, "Upload name conflict check failed");
        setNameConflicts([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setCheckLoading(false);
      });
    return () => ac.abort();
  }, [pendingFiles]);

  useEffect(() => {
    setConflictDecisions(nameConflicts.map(() => null));
  }, [nameConflicts]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      appendFiles(e.dataTransfer?.files ?? null);
    },
    [appendFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      appendFiles(e.target.files);
      e.target.value = "";
    },
    [appendFiles],
  );

  const handleUpload = useCallback(async () => {
    if (!pendingFiles.length || uploading || checkLoading) return;
    const hasConflicts = nameConflicts.length > 0;
    if (
      hasConflicts &&
      !allConflictChoicesMade(nameConflicts, conflictDecisions)
    ) {
      setError("Choose Skip or Upload as new for each conflicting file.");
      return;
    }
    const filesToUpload = hasConflicts
      ? getFilesToUploadAfterDecisions(
          pendingFiles,
          nameConflicts,
          conflictDecisions as ("skip" | "upload")[],
        )
      : pendingFiles;
    if (filesToUpload.length === 0) {
      setError(null);
      onClose();
      return;
    }
    setError(null);
    setUploading(true);
    uploadControlRef.current = { aborted: false, activeAbort: null };
    const controller = createUploadController();
    try {
      await uploadMediaFilesWithProgress(
        filesToUpload,
        setUploadProgress,
        controller,
      );
      if (controller.isAborted()) return;
      try {
        onUploadComplete();
      } catch {
        /* Upload already succeeded; refresh callback must not look like a failed upload */
      }
      onClose();
    } catch (e) {
      if (controller.isAborted()) {
        setError("Upload cancelled");
        return;
      }
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      uploadControlRef.current = { aborted: false, activeAbort: null };
    }
  }, [
    pendingFiles,
    uploading,
    checkLoading,
    nameConflicts,
    conflictDecisions,
    onUploadComplete,
    onClose,
    createUploadController,
  ]);

  const handleCancelUpload = useCallback(() => {
    uploadControlRef.current.aborted = true;
    uploadControlRef.current.activeAbort?.();
  }, []);

  const handleCancel = useCallback(() => {
    if (uploading) {
      handleCancelUpload();
      return;
    }
    clearFiles();
    onClose();
  }, [clearFiles, onClose, uploading, handleCancelUpload]);

  const hasFiles = pendingFiles.length > 0;
  const hasConflicts = nameConflicts.length > 0;
  const choicesComplete = allConflictChoicesMade(
    nameConflicts,
    conflictDecisions,
  );
  const uploadCount = computeUploadCount({
    pendingFiles,
    nameConflicts,
    conflictDecisions,
    hasConflicts,
    choicesComplete,
  });

  return (
    <ModalRoot onBackdropClick={handleCancel}>
      <ModalPanel
        className={cn("upload-modal-panel")}
        aria-labelledby="upload-title"
        onEscape={handleCancel}
      >
        <ModalTitle id="upload-title">Upload files</ModalTitle>

        <div className="upload-modal-body">
          {!uploading && (
            <div
              className={cn("upload-zone", hasFiles && "upload-zone--compact")}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,text/*,application/json,application/xml,.pdf,.txt,.md,.markdown,.org,.csv,.json,.xml,.yaml,.yml,.log,.rst,.adoc,.asciidoc"
                onChange={handleInputChange}
                className="u-sr-only"
                id="upload-modal-input"
              />
              <label htmlFor="upload-modal-input" style={{ cursor: "pointer" }}>
                <span className="upload-zone__title">
                  {hasFiles ? (
                    <>
                      Drop more files or <strong>click to browse</strong>
                    </>
                  ) : (
                    <>
                      Drop files here or <strong>click to browse</strong>
                    </>
                  )}
                </span>
                {!hasFiles && (
                  <span className="upload-zone__hint">
                    Images, videos, documents
                  </span>
                )}
              </label>
              {!hasFiles && (
                <div className="upload-zone__actions">
                  <button
                    type="button"
                    className="upload-zone__camera-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.setAttribute("capture", "environment");
                      input.onchange = (ev) => {
                        const files = (ev.target as HTMLInputElement).files;
                        if (files) appendFiles(files);
                      };
                      input.click();
                    }}
                  >
                    Take Photo
                  </button>
                </div>
              )}
            </div>
          )}

          {hasFiles && (
            <UploadModalFileList
              pendingFiles={pendingFiles}
              nameConflicts={nameConflicts}
              conflictDecisions={conflictDecisions}
              checkLoading={checkLoading}
              uploading={uploading}
              uploadProgress={uploadProgress}
              error={error}
              onConflictDecisionChange={(index, choice) => {
                setConflictDecisions((prev) => {
                  const next = [...prev];
                  next[index] = choice;
                  return next;
                });
                setError(null);
              }}
              onApplyAllDuplicateDecisions={(choice) => {
                setConflictDecisions(nameConflicts.map(() => choice));
                setError(null);
              }}
            />
          )}
        </div>

        <div className="upload-modal-footer">
          <ModalActions className="upload-modal-footer__actions">
            {hasFiles && !uploading && (
              <Button variant="secondary" onClick={clearFiles}>
                Clear
              </Button>
            )}
            <Button variant="secondary" onClick={handleCancel}>
              {uploading ? "Cancel upload" : "Cancel"}
            </Button>
            {hasFiles && (
              <Button
                onClick={() => void handleUpload()}
                disabled={isUploadActionDisabled({
                  uploading,
                  checkLoading,
                  hasConflicts,
                  choicesComplete,
                })}
              >
                {getUploadActionLabel({
                  uploading,
                  checkLoading,
                  hasConflicts,
                  choicesComplete,
                  uploadCount,
                })}
              </Button>
            )}
          </ModalActions>
        </div>
      </ModalPanel>
    </ModalRoot>
  );
}

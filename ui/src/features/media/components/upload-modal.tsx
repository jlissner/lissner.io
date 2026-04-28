import { useCallback, useEffect, useState } from "react";
import { apiJson } from "@/api";
import { ModalPanel, ModalRoot, ModalTitle } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { MediaUploadProgress } from "../lib/post-media-upload-with-progress.js";
import { uploadMediaFilesWithProgress } from "../lib/upload-media-files-with-progress.js";
import {
  getFilesToUploadAfterDecisions,
  type DuplicateConflictDecision,
  UploadModalConfirm,
} from "./upload-modal-confirm.js";
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

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setPendingFiles(Array.from(files));
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
      handleFilesSelected(e.dataTransfer?.files ?? null);
    },
    [handleFilesSelected],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFilesSelected(e.target.files);
      e.target.value = "";
    },
    [handleFilesSelected],
  );

  const handleConfirm = useCallback(async () => {
    if (!pendingFiles.length || uploading || checkLoading) return;
    if (
      nameConflicts.length > 0 &&
      (conflictDecisions.length !== nameConflicts.length ||
        conflictDecisions.some((d) => d == null))
    ) {
      setError(
        "Choose for each conflicting file whether to skip it or upload it as new.",
      );
      return;
    }
    const filesToUpload =
      nameConflicts.length === 0
        ? pendingFiles
        : getFilesToUploadAfterDecisions(
            pendingFiles,
            nameConflicts,
            conflictDecisions as ("skip" | "upload")[],
          );
    if (filesToUpload.length === 0) {
      setError(null);
      onClose();
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await uploadMediaFilesWithProgress(filesToUpload, setUploadProgress);
      try {
        onUploadComplete();
      } catch {
        /* Upload already succeeded; refresh callback must not look like a failed upload */
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }, [
    pendingFiles,
    uploading,
    checkLoading,
    nameConflicts,
    conflictDecisions,
    onUploadComplete,
    onClose,
  ]);

  const handleCancel = useCallback(() => {
    setPendingFiles([]);
    setError(null);
    onClose();
  }, [onClose]);

  const hasFiles = pendingFiles.length > 0;
  const totalBytes = pendingFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <ModalRoot onBackdropClick={handleCancel}>
      <ModalPanel
        className={cn(hasFiles && "upload-modal-panel")}
        style={
          hasFiles
            ? undefined
            : { minWidth: 360, maxHeight: "90vh", overflow: "auto" }
        }
        aria-labelledby="upload-title"
        onEscape={handleCancel}
      >
        <ModalTitle id="upload-title">Upload files</ModalTitle>
        {!hasFiles ? (
          <div
            className="upload-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleInputChange}
              className="u-sr-only"
              id="upload-modal-input"
            />
            <label htmlFor="upload-modal-input" style={{ cursor: "pointer" }}>
              <span className="upload-zone__title">
                Drop files here or <strong>click to browse</strong>
              </span>
              <span className="upload-zone__hint">
                Images, videos, documents
              </span>
            </label>
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
                    if (files) handleFilesSelected(files);
                  };
                  input.click();
                }}
              >
                Take Photo
              </button>
            </div>
          </div>
        ) : (
          <UploadModalConfirm
            fileCount={pendingFiles.length}
            totalBytes={totalBytes}
            pendingFiles={pendingFiles}
            uploading={uploading}
            uploadProgress={uploadProgress}
            error={error}
            onChooseDifferent={() => setPendingFiles([])}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            nameConflicts={nameConflicts}
            checkLoading={checkLoading}
            conflictDecisions={conflictDecisions}
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
            onResetDuplicateDecisions={() => {
              setConflictDecisions(nameConflicts.map(() => null));
              setError(null);
            }}
          />
        )}
      </ModalPanel>
    </ModalRoot>
  );
}

import { prependApiUrl } from "@/api";

export type MediaUploadProgress = {
  currentFile: number;
  totalFiles: number;
  fileName: string;
  fileLoaded: number;
  fileTotal: number;
  overallLoaded: number;
  overallTotal: number;
  retryAttempt?: number;
};

interface AbortControllerLike {
  abort: () => void;
  isAborted: () => boolean;
  /** Registers the active XHR abort handler for the current upload. */
  setActiveAbort?: (abortFn: (() => void) | null) => void;
}

/**
 * POST multipart to `/media/upload` via XMLHttpRequest so `upload.onprogress` works (fetch does not expose upload progress).
 */
export function postMediaUploadWithProgress(
  formData: FormData,
  onProgress: (loaded: number, total: number) => void,
  controller?: AbortControllerLike,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", prependApiUrl("/media/upload"));
    xhr.responseType = "json";
    xhr.withCredentials = true;

    const clearActiveAbort = () => controller?.setActiveAbort?.(null);

    if (controller) {
      controller.setActiveAbort?.(() => xhr.abort());
      xhr.addEventListener("abort", () => {
        clearActiveAbort();
        reject(new Error("Upload cancelled"));
      });
    }

    xhr.upload.addEventListener("progress", (e) => {
      if (controller?.isAborted()) return;
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total);
      } else if (e.loaded > 0) {
        onProgress(e.loaded, 0);
      }
    });

    xhr.addEventListener("load", () => {
      if (controller?.isAborted()) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        clearActiveAbort();
        resolve();
        return;
      }
      clearActiveAbort();
      const body = xhr.response as { error?: string } | null;
      const err =
        body && typeof body.error === "string"
          ? body.error
          : `Upload failed (${xhr.status})`;
      reject(new Error(err));
    });
    xhr.addEventListener("error", () => {
      if (controller?.isAborted()) return;
      clearActiveAbort();
      reject(new Error("Network error"));
    });
    xhr.send(formData);
  });
}

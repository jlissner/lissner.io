export type MediaUploadProgress = {
  currentFile: number;
  totalFiles: number;
  fileName: string;
  fileLoaded: number;
  fileTotal: number;
  overallLoaded: number;
  overallTotal: number;
};

/**
 * POST multipart to `/api/media/upload` via XMLHttpRequest so `upload.onprogress` works (fetch does not expose upload progress).
 */
export function postMediaUploadWithProgress(
  formData: FormData,
  onProgress: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/upload");
    xhr.responseType = "json";
    xhr.withCredentials = true;
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total);
      } else if (e.loaded > 0) {
        onProgress(e.loaded, 0);
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      const body = xhr.response as { error?: string } | null;
      const err =
        body && typeof body.error === "string" ? body.error : `Upload failed (${xhr.status})`;
      reject(new Error(err));
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
    xhr.send(formData);
  });
}

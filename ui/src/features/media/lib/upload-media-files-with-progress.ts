import {
  postMediaUploadWithProgress,
  type MediaUploadProgress,
} from "./post-media-upload-with-progress.js";

function resolveFileTotal(file: File, xhrTotal: number, fallback: number): number {
  if (xhrTotal > 0) return xhrTotal;
  if (file.size > 0) return file.size;
  return fallback;
}

export interface UploadController {
  abort: () => void;
  isAborted: () => boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

async function uploadWithRetry(
  formData: FormData,
  onProgress: (loaded: number, total: number) => void,
  controller: UploadController,
  onRetry: (attempt: number) => void
): Promise<void> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (controller.isAborted()) throw new Error("Upload cancelled");
    try {
      await postMediaUploadWithProgress(formData, onProgress, controller);
      return;
    } catch (e) {
      if (controller.isAborted()) {
        const err = new Error("Upload cancelled") as Error & { cause: unknown };
        err.cause = e;
        throw err;
      }
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRIES) {
        onRetry(attempt + 1);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_BASE * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError || new Error("Upload failed after retries");
}

export async function uploadMediaFilesWithProgress(
  files: File[],
  onProgress: (progress: MediaUploadProgress | null) => void,
  uploadController?: UploadController
): Promise<void> {
  const controller = uploadController ?? { abort: () => {}, isAborted: () => false };
  const overallTotal = files.reduce((sum, f) => sum + f.size, 0);
  let retryCount = 0;
  const acc = { completedBytes: 0 };
  for (const [i, file] of files.entries()) {
    if (controller.isAborted()) break;
    const fileTotalFallback = file.size > 0 ? file.size : 1;
    const bumpProgress = (loaded: number, xhrTotal: number) => {
      const fileTotal = resolveFileTotal(file, xhrTotal, fileTotalFallback);
      onProgress({
        currentFile: i + 1,
        totalFiles: files.length,
        fileName: file.name,
        fileLoaded: loaded,
        fileTotal,
        overallLoaded: acc.completedBytes + loaded,
        overallTotal: overallTotal > 0 ? overallTotal : fileTotal,
        retryAttempt: retryCount,
      });
    };
    bumpProgress(0, 0);
    const formData = new FormData();
    formData.append("file", file);
    await uploadWithRetry(formData, bumpProgress, controller, (attempt) => {
      retryCount = attempt;
      onProgress({
        currentFile: i + 1,
        totalFiles: files.length,
        fileName: file.name,
        fileLoaded: 0,
        fileTotal: fileTotalFallback,
        overallLoaded: acc.completedBytes,
        overallTotal: overallTotal > 0 ? overallTotal : fileTotalFallback,
        retryAttempt: attempt,
      });
    });
    acc.completedBytes += file.size;
  }
}

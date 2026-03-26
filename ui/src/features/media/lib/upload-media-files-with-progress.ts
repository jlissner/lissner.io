import {
  postMediaUploadWithProgress,
  type MediaUploadProgress,
} from "./post-media-upload-with-progress.js";

export async function uploadMediaFilesWithProgress(
  files: File[],
  onProgress: (progress: MediaUploadProgress | null) => void
): Promise<void> {
  const overallTotal = files.reduce((sum, f) => sum + f.size, 0);
  const acc = { completedBytes: 0 };
  for (const [i, file] of files.entries()) {
    const fileTotalFallback = file.size > 0 ? file.size : 1;
    const bumpProgress = (loaded: number, xhrTotal: number) => {
      const fileTotal =
        xhrTotal > 0 ? xhrTotal : file.size > 0 ? file.size : fileTotalFallback;
      onProgress({
        currentFile: i + 1,
        totalFiles: files.length,
        fileName: file.name,
        fileLoaded: loaded,
        fileTotal,
        overallLoaded: acc.completedBytes + loaded,
        overallTotal: overallTotal > 0 ? overallTotal : fileTotal,
      });
    };
    bumpProgress(0, 0);
    const formData = new FormData();
    formData.append("file", file);
    await postMediaUploadWithProgress(formData, bumpProgress);
    acc.completedBytes += file.size;
  }
}


import { prependApiUrl } from "@/api";

export const BULK_DOWNLOAD_STAGGER_MS = 250;

type MediaDownload = {
  mediaId: string;
  filename: string;
};

type DownloadMediaFilesDeps = {
  downloadOne?: (mediaId: string, filename: string) => void;
  schedule?: (task: () => void, delayMs: number) => void;
};

const defaultSchedule = (task: () => void, delayMs: number): void => {
  globalThis.setTimeout(task, delayMs);
};

export function downloadMediaFile(mediaId: string, filename: string): void {
  const link = document.createElement("a");
  link.href = prependApiUrl(`/media/${mediaId}`);
  link.download = filename;
  link.click();
}

/** Stagger clicks so the browser does not cancel concurrent downloads. */
export function downloadMediaFiles(
  files: ReadonlyArray<MediaDownload>,
  deps: DownloadMediaFilesDeps = {},
): void {
  const downloadOne = deps.downloadOne ?? downloadMediaFile;
  const schedule = deps.schedule ?? defaultSchedule;

  files.forEach((file, index) => {
    schedule(() => {
      downloadOne(file.mediaId, file.filename);
    }, index * BULK_DOWNLOAD_STAGGER_MS);
  });
}

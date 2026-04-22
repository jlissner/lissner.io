import type { MediaUploadProgress } from "../lib/post-media-upload-with-progress.js";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateMiddle(name: string, max = 52): string {
  if (name.length <= max) return name;
  const keep = max - 1;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return `${name.slice(0, head)}…${name.slice(-tail)}`;
}

export function UploadProgressPanel({
  progress,
  rootClassName = "upload-modal-progress u-mb-5",
}: {
  progress: MediaUploadProgress;
  /** e.g. omit bottom margin when embedded in another control */
  rootClassName?: string;
}) {
  const filePct =
    progress.fileTotal > 0
      ? Math.min(
          100,
          Math.round((100 * progress.fileLoaded) / progress.fileTotal),
        )
      : null;
  const showOverall = progress.totalFiles > 1 && progress.overallTotal > 0;
  const overallPct = showOverall
    ? Math.min(
        100,
        Math.round((100 * progress.overallLoaded) / progress.overallTotal),
      )
    : null;
  return (
    <div
      className={rootClassName}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="u-text-sm u-font-medium u-mb-1" style={{ marginTop: 0 }}>
        {progress.totalFiles > 1
          ? `Uploading file ${progress.currentFile} of ${progress.totalFiles}`
          : "Uploading"}
      </p>
      <p
        className="u-text-xs u-text-muted u-mb-2"
        style={{ marginTop: 0 }}
        title={progress.fileName}
      >
        {truncateMiddle(progress.fileName)}
      </p>
      <p className="u-text-xs u-text-muted u-mb-1" style={{ marginTop: 0 }}>
        This file: {formatBytes(progress.fileLoaded)}
        {progress.fileTotal > 0 ? ` / ${formatBytes(progress.fileTotal)}` : ""}
        {filePct != null ? ` (${filePct}%)` : ""}
      </p>
      {progress.fileTotal > 0 ? (
        <progress
          className="upload-modal-progress__bar"
          value={progress.fileLoaded}
          max={progress.fileTotal}
        />
      ) : (
        <progress className="upload-modal-progress__bar" />
      )}
      {showOverall && (
        <>
          <p className="u-text-xs u-text-muted u-mt-3 u-mb-1">
            Overall: {formatBytes(progress.overallLoaded)} /{" "}
            {formatBytes(progress.overallTotal)}
            {overallPct != null ? ` (${overallPct}%)` : ""}
          </p>
          <progress
            className="upload-modal-progress__bar"
            value={progress.overallLoaded}
            max={progress.overallTotal}
          />
        </>
      )}
    </div>
  );
}

export interface SyncProgress {
  phase:
    | "listing"
    | "upload-media"
    | "upload-thumbnails"
    | "upload-db"
    | "download-media"
    | "download-thumbnails"
    | "merge-db"
    | "done"
    | "error";
  current: number;
  total: number;
  message: string;
  error?: string;
}

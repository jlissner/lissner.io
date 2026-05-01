/**
 * JSON shapes for REST endpoints (shared by server + UI).
 * Prefer importing these instead of duplicating inline object types.
 */

import { SyncProgressMessage } from "./activity.js";

/** GET /api/search?q= */
type MediaListFields = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dateTaken?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  backedUpAt?: string | null;
  /** Present when this item is the still (`*.mp.jpg`) in a Pixel motion pair; companion is the `*.mp` clip. */
  motionCompanionId?: string | null;
};

export type MediaListItem = MediaListFields & {
  indexed: boolean;
  backedUp: boolean;
  people?: string[];
};

export type SearchMediaResponse = SearchResultItem[];

/** Same enrichment as list media; search omits some optional location fields. */
export type SearchResultItem = MediaListItem;

/** Other half of a Pixel motion pair (`*.mp.jpg` still ↔ `*.mp` clip). */
type MediaMotionCompanionSummary = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
};

/** GET /api/media/:id/details — extends list fields with optional motion companion. */
export type MediaDetailsApiResponse = MediaListItem & {
  motionCompanion?: MediaMotionCompanionSummary | null;
  /** User tags (normalized to lowercase). */
  tags?: string[];
};

/** GET /api/media/tags — distinct tags for search/autocomplete. */
export type MediaTagsListResponse = { tags: string[] };

/** PUT /api/media/:id/tags */
export type MediaTagsPutRequest = { tags: string[] };

/** PATCH /api/media/:id */
export type MediaPatchRequest = { dateTaken: string | null };

export type MediaPatchResponse = { dateTaken: string | null };

/** GET /api/media */
export type MediaListQueryResponse = {
  items: MediaListItem[];
  total: number;
};

export type UploadNameConflict = {
  requestedName: string;
  existing: { id: string; originalName: string; uploadedAt: string };
};

/** GET /api/backup/status */
export type BackupSyncStatusResponse = {
  inProgress: boolean;
  startedAt: string | null;
  lastResult: SyncProgressMessage | null;
  lastError: string | null;
};

/** POST /api/backup/run success */
export type BackupRunStartedResponse = { started: true };

/** GET /api/people */
export type PersonSummary = {
  id: number;
  name: string;
  photoCount: number;
  representativeMediaId: string | null;
};

/** GET /api/people/:id/media */
export type PersonMediaPreviewItem = MediaListItem & {
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
};

/** POST /api/people */
export type CreatePersonResponse = { id: number; name: string };

/** DELETE /api/people/:id */
export type DeletePersonResponse = { deleted: number };

/** POST /api/people/:id/merge */
export type MergePeopleResponse = { merged: number; into: number };

/** PUT /api/people/:id */
export type UpdatePersonResponse = { id: number; name: string };

/** POST /api/people/match-faces */
type FaceMatchAutoMerged = {
  merged: number;
  into: number;
  intoName: string;
};

export type FaceMatchReviewItem = {
  placeholderPersonId: number;
  placeholderName: string;
  hasFaceDescriptors: boolean;
  topMatch: { personId: number; name: string; score: number } | null;
  otherMatches: Array<{ personId: number; name: string; score: number }>;
  previewMediaId: string | null;
  previewFaceCrop: boolean;
};

export type FaceMatchRunResponse = {
  /** @deprecated Always empty; merges require explicit user confirmation. */
  autoMerged: FaceMatchAutoMerged[];
  reviewQueue: FaceMatchReviewItem[];
};

/** GET /api/admin/db-backups */
type AdminDbBackupItem = {
  key: string;
  size: number;
  lastModified: string;
};

export type AdminDbBackupsResponse = { backups: AdminDbBackupItem[] };

export type AdminDbRestoreResponse = { restored: true };

/** POST /api/admin/duplicates/bulk-delete */
export type AdminDuplicatesBulkDeleteRequest = { mediaIds: string[] };

type AdminDuplicatesBulkDeleteItemResult =
  | { mediaId: string; ok: true }
  | {
      mediaId: string;
      ok: false;
      reason: "not_found" | "forbidden" | "delete_failed";
    };

export type AdminDuplicatesBulkDeleteResponse = {
  results: AdminDuplicatesBulkDeleteItemResult[];
};

/** POST /api/admin/thumbnails/repair */
export type AdminThumbnailRepairRequest = {
  maxGenerations?: number;
};

type AdminThumbnailRepairFailureReason =
  | "not_found"
  | "bad_type"
  | "file_missing"
  | "ffmpeg_missing"
  | "thumb_failed"
  | "thumb_verify_failed";

export type AdminThumbnailRepairResponse = {
  scanned: number;
  missingFound: number;
  generated: number;
  skippedAlreadyOk: number;
  skippedNoLocalFile: number;
  skippedIneligible: number;
  skippedDueToCap: number;
  maxGenerations: number;
  failed: Array<{
    mediaId: string;
    reason: AdminThumbnailRepairFailureReason;
    /** Present when extra context helps explain the failure (not swallowed). */
    detail?: string;
  }>;
};

/** GET /api/admin/media-file-issues */
export type AdminMediaFileIssueItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  issueCode: string;
  issueDetail: string | null;
  issueAt: string | null;
};

export type AdminMediaFileIssuesResponse = {
  items: AdminMediaFileIssueItem[];
};

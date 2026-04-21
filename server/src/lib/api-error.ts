import type { Response } from "express";

/**
 * Stable machine-readable API error codes (JSON body `code` field).
 * Human text stays in `error`; UIs may branch on `code`.
 */
export type ApiErrorCode =
  | "validation_error"
  | "upload_interrupted"
  | "internal_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "file_missing"
  | "bad_request"
  | "conflict"
  | "service_unavailable"
  | "auth_required"
  | "not_whitelisted"
  | "magic_link_send_failed"
  | "not_authenticated"
  | "admin_required"
  | "index_in_progress"
  | "index_job_not_cancelable"
  | "missing_query"
  | "search_query_invalid"
  | "search_failed"
  | "backup_not_configured"
  | "sync_in_progress"
  | "sql_explorer_disabled"
  | "data_explorer_disabled"
  | "hash_failed"
  | "admin_not_found"
  | "no_file_uploaded"
  | "no_files_shared"
  | "upload_owner_config"
  | "delete_forbidden"
  | "delete_failed"
  | "patch_forbidden"
  | "patch_bad_request"
  | "patch_invalid_date"
  | "download_failed"
  | "face_detection_failed"
  | "crop_failed"
  | "person_not_in_image"
  | "thumbnail_bad_type"
  | "thumbnail_ffmpeg_missing"
  | "thumbnail_failed"
  | "content_not_text"
  | "read_failed"
  | "person_not_found"
  | "merge_invalid_ids"
  | "merge_into_self"
  | "face_invalid_person"
  | "face_not_tagged"
  | "face_bad_assign_to"
  | "face_same_person"
  | "face_target_missing"
  | "face_box_required"
  | "face_person_required"
  | "face_person_unknown"
  | "invalid_backup_key"
  | "invalid_db_backup"
  | "db_restore_failed"
  | "invalid_code"
  | "code_expired"
  | "code_already_used"
  | "token_reused"
  | "refresh_failed"
  | "rate_limited";

export function sendApiError(
  res: Response,
  status: number,
  message: string,
  code: ApiErrorCode,
  extra?: Record<string, unknown>
): void {
  res.status(status).json({ error: message, code, ...extra });
}

/** When only HTTP status is known (e.g. generic admin failures). */
export function apiErrorCodeForHttpStatus(status: number): ApiErrorCode {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 503) return "service_unavailable";
  return "internal_error";
}

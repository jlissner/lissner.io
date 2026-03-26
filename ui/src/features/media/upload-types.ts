/**
 * POST /api/media/upload/check-names — aligned with shared/src/api.ts `UploadNameConflict`.
 */
export type UploadNameConflict = {
  requestedName: string;
  existing: { id: string; originalName: string; uploadedAt: string };
};

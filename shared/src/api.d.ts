/**
 * JSON shapes for REST endpoints (shared by server + UI).
 * Prefer importing these instead of duplicating inline object types.
 */
import type { IndexActivitySlice, SyncProgressMessage } from "./activity.js";
export type { IndexActivitySlice, SyncProgressMessage };
/** Standard error JSON from `errorHandler` and ad-hoc route errors. */
export type ApiErrorBody = {
    error: string;
    code?: string;
};
/** GET /api/search/index/status */
export type SearchIndexStatusResponse = IndexActivitySlice;
/** GET /api/search?q= */
export interface MediaListFields {
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
}
export interface MediaListItem extends MediaListFields {
    indexed: boolean;
    backedUp: boolean;
    people?: string[];
}
export type SearchMediaResponse = SearchResultItem[];
/** Same enrichment as list media; search omits some optional location fields. */
export type SearchResultItem = MediaListItem;
/** GET /api/media */
export interface MediaListQueryResponse {
    items: MediaListItem[];
    total: number;
}
/** POST /api/media/upload (201) */
export interface MediaUploadResponse {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
}
/** GET /api/backup/config */
export interface BackupConfigResponse {
    configured: boolean;
    missingVars: string[];
}
/** GET /api/backup/status */
export interface BackupSyncStatusResponse {
    configured: boolean;
    inProgress: boolean;
    startedAt: string | null;
    lastResult: SyncProgressMessage | null;
    lastError: string | null;
}
/** POST /api/backup/run success */
export type BackupRunStartedResponse = {
    started: true;
};
/** GET /api/people */
export interface PersonSummary {
    id: number;
    name: string;
    photoCount: number;
}
/** GET /api/people/review/queue */
export interface ReviewQueueItem {
    mediaId: string;
    personId: number;
    confidence: number | null;
    isSingleFace: boolean;
    otherPeopleInPhoto: Array<{
        id: number;
        name: string;
    }>;
}
/** GET /api/people/:id/media */
export interface PersonMediaPreviewItem {
    id: string;
    mimeType: string;
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
    backedUp: boolean;
}
/** POST /api/people */
export type CreatePersonResponse = {
    id: number;
    name: string;
};
/** DELETE /api/people/:id */
export type DeletePersonResponse = {
    deleted: number;
};
/** POST /api/people/:id/merge */
export type MergePeopleResponse = {
    merged: number;
    into: number;
};
/** PUT /api/people/:id */
export type UpdatePersonResponse = {
    id: number;
    name: string;
};
/** POST /api/people/match-faces */
export type FaceMatchAutoMerged = {
    merged: number;
    into: number;
    intoName: string;
};
export type FaceMatchReviewItem = {
    placeholderPersonId: number;
    placeholderName: string;
    hasFaceDescriptors: boolean;
    topMatch: {
        personId: number;
        name: string;
        score: number;
    } | null;
    otherMatches: Array<{
        personId: number;
        name: string;
        score: number;
    }>;
    previewMediaId: string | null;
    previewFaceCrop: boolean;
};
export type FaceMatchRunResponse = {
    autoMerged: FaceMatchAutoMerged[];
    reviewQueue: FaceMatchReviewItem[];
};
/** GET /api/auth/config or similar bootstrap */
export type AuthConfigResponse = {
    authEnabled: boolean;
};

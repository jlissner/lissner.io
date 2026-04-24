import { ApiError, apiFetch, apiJson } from "@/api";
import {
  MediaDetailsApiResponse,
  MediaPatchRequest,
  MediaTagsListResponse,
  MediaTagsPutRequest,
} from "@shared";
import {
  FaceBox,
  TaggedFace,
} from "./components/media-viewer/media-viewer-types";
import type { Person } from "../people/components/people-types";

type ErrorBody = { error?: unknown };

async function toApiError(res: Response, fallback: string): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ErrorBody | null;
  const message = typeof body?.error === "string" ? body.error : fallback;
  return new ApiError(res.status, message, body);
}

export function getMediaDetails(
  mediaId: string,
): Promise<MediaDetailsApiResponse> {
  return apiJson<MediaDetailsApiResponse>(`media/${mediaId}/details`);
}

export function listMediaTags(): Promise<MediaTagsListResponse> {
  return apiJson<MediaTagsListResponse>("media/tags");
}

export function patchMediaDateTaken(
  mediaId: string,
  body: MediaPatchRequest,
): Promise<Response> {
  return apiFetch(`media/${mediaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function putMediaTags(
  mediaId: string,
  body: MediaTagsPutRequest,
): Promise<void> {
  const res = await apiFetch(`media/${mediaId}/tags`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res, "Could not save tags");
}

export async function deleteMediaById(id: string): Promise<void> {
  const res = await apiFetch(`media/${id}`, { method: "DELETE" });
  if (!res.ok) throw await toApiError(res, "Delete failed");
}

export async function runBulkIndex(mediaIds: string[]): Promise<void> {
  await apiJson("search/index?force=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaIds }),
  });
}

export async function triggerIndex(
  force = false,
): Promise<{ started?: boolean; error?: string }> {
  const path = force ? "search/index?force=true" : "search/index";
  return apiJson<{ started?: boolean; error?: string }>(path, {
    method: "POST",
  });
}

export function listMediaFaces(
  mediaId: string,
): Promise<{ detected?: FaceBox[]; tagged?: TaggedFace[] }> {
  return apiJson<{ detected?: FaceBox[]; tagged?: TaggedFace[] }>(
    `media/${mediaId}/faces`,
  );
}

export function addPersonToMedia(
  mediaId: string,
  body: { createNew?: true; personId?: number; box: FaceBox },
): Promise<unknown> {
  return apiJson(`media/${mediaId}/people`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function removePersonFromMedia(
  mediaId: string,
  personId: number,
): Promise<void> {
  const res = await apiFetch(`media/${mediaId}/people/${personId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await toApiError(res, "Failed to remove tag");
}

export async function reassignPersonInMedia(
  mediaId: string,
  personId: number,
  assignTo: number,
): Promise<void> {
  const res = await apiFetch(`media/${mediaId}/people/${personId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignTo }),
  });
  if (!res.ok) throw await toApiError(res, "Failed to reassign");
}

export function reassignPersonToNewInMedia(
  mediaId: string,
  personId: number,
): Promise<{ newPersonId: number }> {
  return apiJson<{ newPersonId: number }>(
    `media/${mediaId}/people/${personId}/reassign-new`,
    {
      method: "POST",
    },
  );
}

export function listPeopleForTagging(): Promise<Person[]> {
  return apiJson<Person[]>("people");
}

export async function bulkPatchDateTaken(
  mediaIds: string[],
  dateTaken: string | null,
): Promise<{ succeeded: number; failed: number }> {
  const acc = { succeeded: 0, failed: 0 };
  for (const id of mediaIds) {
    const res = await apiFetch(`media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateTaken }),
    });
    if (res.ok) acc.succeeded += 1;
    else acc.failed += 1;
  }
  return acc;
}

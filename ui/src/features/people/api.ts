import { ApiError, apiFetch, apiJson } from "@/api/client";
import type {
  CreatePersonResponse,
  DeletePersonResponse,
  FaceMatchRunResponse,
  MergePeopleResponse,
  PersonMediaPreviewItem,
  PersonSummary,
  UpdatePersonResponse,
} from "../../../../shared/src/api.js";
import type { MergeSuggestion } from "./components/people-types";

type ErrorBody = { error?: unknown };

async function toApiError(res: Response, fallback: string): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ErrorBody | null;
  const message = typeof body?.error === "string" ? body.error : fallback;
  return new ApiError(res.status, message, body);
}

export function listPeople(): Promise<PersonSummary[]> {
  return apiJson<PersonSummary[]>("people");
}

export function listPersonMediaPreviews(
  personId: number,
): Promise<PersonMediaPreviewItem[]> {
  return apiJson<PersonMediaPreviewItem[]>(
    `people/${personId}/media?limit=100`,
  );
}

export async function listMergeSuggestions(
  personId: number,
): Promise<MergeSuggestion[]> {
  const data = await apiJson<{ suggestions?: MergeSuggestion[] }>(
    `people/${personId}/merge-suggestions`,
  );
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}

export function mergePeople(
  mergeFrom: number,
  mergeInto: number,
): Promise<MergePeopleResponse> {
  return apiJson<MergePeopleResponse>(`people/${mergeFrom}/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mergeInto }),
  });
}

export function createPerson(name: string): Promise<CreatePersonResponse> {
  return apiJson<CreatePersonResponse>("people", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function updatePerson(
  id: number,
  name: string,
): Promise<UpdatePersonResponse> {
  return apiJson<UpdatePersonResponse>(`people/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function deletePerson(id: number): Promise<DeletePersonResponse> {
  return apiJson<DeletePersonResponse>(`people/${id}`, { method: "DELETE" });
}

export function runMatchFaces(): Promise<FaceMatchRunResponse> {
  return apiJson<FaceMatchRunResponse>("people/match-faces", {
    method: "POST",
  });
}

export async function removeTagFromMedia(
  mediaId: string,
  personId: number,
): Promise<void> {
  const res = await apiFetch(`media/${mediaId}/people/${personId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await toApiError(res, "Failed to remove tag");
}

export async function reassignTagToPerson(
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

export async function reassignTagToNewPerson(
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

import type {
  AdminDbBackupsResponse,
  AdminDbRestoreResponse,
  AdminDuplicatesBulkDeleteRequest,
  AdminDuplicatesBulkDeleteResponse,
  AdminMediaFileIssuesResponse,
  AdminThumbnailRepairRequest,
  AdminThumbnailRepairResponse,
} from "@shared";
import { apiJson } from "@/api";

export interface AdminWhitelistEntry {
  id: number;
  email: string;
  isAdmin: boolean;
  invitedAt: string;
  personId: number | null;
}

export interface AdminUser {
  id: number;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  personId: number | null;
}

export interface PeopleDirectoryEntry {
  personId: number;
  name: string;
  email: string | null;
  canLogin: boolean;
  isAdmin: boolean;
  isIdentity: boolean;
}

interface AdminPerson {
  id: number;
  name: string;
}

export interface DataExplorerColumn {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

export function listWhitelist(): Promise<AdminWhitelistEntry[]> {
  return apiJson<AdminWhitelistEntry[]>("admin/whitelist");
}

export function listUsers(): Promise<AdminUser[]> {
  return apiJson<AdminUser[]>("admin/users");
}

export function listPeopleDirectory(): Promise<PeopleDirectoryEntry[]> {
  return apiJson<PeopleDirectoryEntry[]>("admin/people-directory");
}

export function createDirectoryPerson(input: {
  name: string;
  email?: string;
  isAdmin?: boolean;
}): Promise<PeopleDirectoryEntry> {
  return apiJson<PeopleDirectoryEntry>("admin/people-directory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateDirectoryPerson(
  personId: number,
  input: { name: string; email?: string; isAdmin?: boolean },
): Promise<PeopleDirectoryEntry> {
  return apiJson<PeopleDirectoryEntry>(`admin/people-directory/${personId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function deleteDirectoryPerson(personId: number): Promise<{
  deleted: number;
}> {
  return apiJson<{ deleted: number }>(`admin/people-directory/${personId}`, {
    method: "DELETE",
  });
}

export async function listPeopleForAdmin(): Promise<AdminPerson[]> {
  const data = await apiJson<AdminPerson[] | { people?: AdminPerson[] }>(
    "people",
  );
  return Array.isArray(data) ? data : (data.people ?? []);
}

export function getSqlExplorerAvailable(): Promise<{ available: boolean }> {
  return apiJson<{ available: boolean }>("admin/sql-explorer-available");
}

export function getDataExplorerAvailable(): Promise<{ available: boolean }> {
  return apiJson<{ available: boolean }>("admin/data-explorer-available");
}

export function runSql(
  query: string,
): Promise<
  | { type: "select"; columns: string[]; rows: Record<string, unknown>[] }
  | { type: "write"; changes: number; lastInsertRowid: number }
> {
  return apiJson("admin/sql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
}

export function addWhitelistEntry(input: {
  email: string;
  isAdmin: boolean;
  personId?: number;
}): Promise<unknown> {
  return apiJson("admin/whitelist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function removeWhitelistEntry(id: number): Promise<unknown> {
  return apiJson(`admin/whitelist/${id}`, { method: "DELETE" });
}

export function listDataExplorerTables(): Promise<string[]> {
  return apiJson<string[]>("admin/data-explorer/tables");
}

export function getDataExplorerSchema(
  table: string,
  query?: string,
): Promise<{ schema: DataExplorerColumn[]; count: number }> {
  const q = query?.trim();
  const path = q
    ? `admin/data-explorer/tables/${table}?q=${encodeURIComponent(q)}`
    : `admin/data-explorer/tables/${table}`;
  return apiJson<{ schema: DataExplorerColumn[]; count: number }>(path);
}

export function getDataExplorerRows(
  table: string,
  params: { limit: number; offset: number; q?: string },
): Promise<Record<string, unknown>[]> {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });
  if (params.q && params.q.trim() !== "") query.set("q", params.q.trim());
  return apiJson<Record<string, unknown>[]>(
    `admin/data-explorer/tables/${table}/rows?${query}`,
  );
}

export function insertDataExplorerRow(
  table: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  return apiJson(`admin/data-explorer/tables/${table}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateDataExplorerRow(
  table: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return apiJson(`admin/data-explorer/tables/${table}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteDataExplorerRow(
  table: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return apiJson(`admin/data-explorer/tables/${table}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface DuplicateMatch {
  mediaId: string;
  duplicateOfId: string;
  hammingDistance: number;
}

export function computeAllHashes(): Promise<{
  computed: number;
  failed: number;
  total: number;
}> {
  return apiJson<{ computed: number; failed: number; total: number }>(
    "admin/duplicates/compute-all-hashes",
    { method: "POST" },
  );
}

export function getAllDuplicates(): Promise<{ duplicates: DuplicateMatch[] }> {
  return apiJson<{ duplicates: DuplicateMatch[] }>("admin/duplicates");
}

export function bulkDeleteMediaByIds(
  mediaIds: string[],
): Promise<AdminDuplicatesBulkDeleteResponse> {
  const body: AdminDuplicatesBulkDeleteRequest = { mediaIds };
  return apiJson<AdminDuplicatesBulkDeleteResponse>(
    "admin/duplicates/bulk-delete",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export function repairAdminThumbnails(
  body: AdminThumbnailRepairRequest = {},
): Promise<AdminThumbnailRepairResponse> {
  const payload: AdminThumbnailRepairRequest = { ...body };
  return apiJson<AdminThumbnailRepairResponse>("admin/thumbnails/repair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listMediaFileIssues(): Promise<AdminMediaFileIssuesResponse> {
  return apiJson<AdminMediaFileIssuesResponse>("admin/media-file-issues");
}

export function clearMediaFileIssue(mediaId: string): Promise<{ ok: true }> {
  return apiJson<{ ok: true }>(`admin/media-file-issues/${mediaId}/clear`, {
    method: "POST",
  });
}

export function listDbBackups(): Promise<AdminDbBackupsResponse> {
  return apiJson<AdminDbBackupsResponse>("admin/db-backups");
}

export function restoreDbFromBackup(
  key: string,
): Promise<AdminDbRestoreResponse> {
  return apiJson<AdminDbRestoreResponse>("admin/db-restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}

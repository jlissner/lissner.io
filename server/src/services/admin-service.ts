/** Dev-only tooling flags (SQL / Data explorer). */
import * as authDb from "../db/auth.js";
import * as mediaDb from "../db/media.js";

export function isSqlExplorerEnabled(): boolean {
  return process.env.SQL_EXPLORER_ENABLED === "true" && process.env.NODE_ENV !== "production";
}

export function isDataExplorerEnabled(): boolean {
  return process.env.DATA_EXPLORER_ENABLED === "true" && process.env.NODE_ENV !== "production";
}

export function runSqlQuery(query: string) {
  return mediaDb.runSql(query);
}

export function listDataExplorerTables() {
  return mediaDb.getDataExplorerTables();
}

export function getDataExplorerSchemaAndCount(table: string, q?: string) {
  return {
    schema: mediaDb.getDataExplorerTableSchema(table),
    count: mediaDb.getDataExplorerRowCount(table, q),
  };
}

export function listDataExplorerRows(table: string, limit: number, offset: number, q?: string) {
  return mediaDb.getDataExplorerRows(table, limit, offset, q);
}

export function insertDataExplorerRow(table: string, body: Record<string, unknown>) {
  return mediaDb.insertDataExplorerRow(table, body);
}

export function updateDataExplorerRow(
  table: string,
  pk: Record<string, unknown>,
  data: Record<string, unknown>
) {
  return mediaDb.updateDataExplorerRow(table, pk, data);
}

export function deleteDataExplorerRow(table: string, pk: Record<string, unknown>) {
  return mediaDb.deleteDataExplorerRow(table, pk);
}

export function listWhitelistEntries() {
  return authDb.getWhitelist();
}

export function addWhitelistEntry(input: {
  email: string;
  isAdmin: boolean;
  personId?: number;
  actorUserId?: number;
}) {
  return authDb.addToWhitelist(input.email, input.isAdmin, input.actorUserId, input.personId);
}

export function removeWhitelistEntry(id: number): boolean {
  return authDb.removeFromWhitelist(id);
}

export function listUsers() {
  return authDb.getUsers();
}

export function getUserPeople(userId: number) {
  return authDb.getUserPeople(userId);
}

export function setUserPeople(userId: number, personIds: number[]) {
  authDb.setUserPeople(userId, personIds);
  return personIds;
}

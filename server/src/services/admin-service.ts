/** Dev-only tooling flags (SQL / Data explorer). */
import * as authDb from "../db/auth.js";
import * as mediaDb from "../db/media.js";

export type AdminServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

function ok<T>(value: T): AdminServiceResult<T> {
  return { ok: true, value };
}

function fail<T>(status: number, error: string): AdminServiceResult<T> {
  return { ok: false, status, error };
}

export function isSqlExplorerEnabled(): boolean {
  return (
    process.env.SQL_EXPLORER_ENABLED === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export function isDataExplorerEnabled(): boolean {
  return (
    process.env.DATA_EXPLORER_ENABLED === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export function runSqlQuery(query: string) {
  try {
    return ok(mediaDb.runSql(query));
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : String(err));
  }
}

export function listDataExplorerTables() {
  try {
    return ok(mediaDb.getDataExplorerTables());
  } catch (err) {
    return fail(500, err instanceof Error ? err.message : "Failed");
  }
}

export function getDataExplorerSchemaAndCount(table: string, q?: string) {
  try {
    return ok({
      schema: mediaDb.getDataExplorerTableSchema(table),
      count: mediaDb.getDataExplorerRowCount(table, q),
    });
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : "Failed");
  }
}

export function listDataExplorerRows(
  table: string,
  limit: number,
  offset: number,
  q?: string,
) {
  try {
    return ok(mediaDb.getDataExplorerRows(table, limit, offset, q));
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : "Failed");
  }
}

export function insertDataExplorerRow(
  table: string,
  body: Record<string, unknown>,
) {
  try {
    return ok(mediaDb.insertDataExplorerRow(table, body));
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : "Failed");
  }
}

export function updateDataExplorerRow(
  table: string,
  pk: Record<string, unknown>,
  data: Record<string, unknown>,
) {
  try {
    return ok(mediaDb.updateDataExplorerRow(table, pk, data));
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : "Failed");
  }
}

export function deleteDataExplorerRow(
  table: string,
  pk: Record<string, unknown>,
) {
  try {
    return ok(mediaDb.deleteDataExplorerRow(table, pk));
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : "Failed");
  }
}

export function listWhitelistEntries() {
  return ok(authDb.getWhitelist());
}

export function addWhitelistEntry(input: {
  email: string;
  isAdmin: boolean;
  personId?: number;
  actorUserId?: number;
}) {
  try {
    return ok(
      authDb.addToWhitelist(
        input.email,
        input.isAdmin,
        input.actorUserId,
        input.personId,
      ),
    );
  } catch {
    return fail(400, "Email may already be on whitelist");
  }
}

export function removeWhitelistEntry(id: number): boolean {
  return authDb.removeFromWhitelist(id);
}

export function listUsers() {
  return ok(authDb.getUsers());
}

export function getUserPeople(userId: number) {
  return ok(authDb.getUserPeople(userId));
}

export function setUserPeople(userId: number, personIds: number[]) {
  authDb.setUserPeople(userId, personIds);
  return ok(personIds);
}

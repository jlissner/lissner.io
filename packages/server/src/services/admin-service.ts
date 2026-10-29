/** Dev-only tooling flags (Data explorer). */
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

export function isDataExplorerEnabled(): boolean {
  return (
    process.env.DATA_EXPLORER_ENABLED === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export async function listDataExplorerTables() {
  try {
    return ok(await mediaDb.getDataExplorerTables());
  } catch (err) {
    return fail(500, err instanceof Error ? err.message : "Failed");
  }
}

export async function getDataExplorerSchemaAndCount(table: string, q?: string) {
  try {
    return ok({
      schema: await mediaDb.getDataExplorerTableSchema(table),
      count: await mediaDb.getDataExplorerRowCount(table, q),
    });
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : "Failed");
  }
}

export async function listDataExplorerRows(
  table: string,
  limit: number,
  offset: number,
  q?: string,
) {
  try {
    return ok(await mediaDb.getDataExplorerRows(table, limit, offset, q));
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : "Failed");
  }
}

export async function insertDataExplorerRow(
  table: string,
  body: Record<string, unknown>,
) {
  try {
    return ok(await mediaDb.insertDataExplorerRow(table, body));
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : "Failed");
  }
}

export async function updateDataExplorerRow(
  table: string,
  pk: Record<string, unknown>,
  data: Record<string, unknown>,
) {
  try {
    return ok(await mediaDb.updateDataExplorerRow(table, pk, data));
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : "Failed");
  }
}

export async function deleteDataExplorerRow(
  table: string,
  pk: Record<string, unknown>,
) {
  try {
    return ok(await mediaDb.deleteDataExplorerRow(table, pk));
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : "Failed");
  }
}

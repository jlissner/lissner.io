import { db } from "./media-db.js";

const VALID_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateTableName(name: string): void {
  if (!VALID_IDENT.test(name)) throw new Error("Invalid table name");
}

export function getDataExplorerTables(): string[] {
  const rows = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all() as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

export interface DataExplorerColumn {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

export function getDataExplorerTableSchema(tableName: string): DataExplorerColumn[] {
  validateTableName(tableName);
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>;
  if (rows.length === 0) throw new Error("Table not found");
  return rows;
}

const DATA_EXPLORER_SEARCH_MAX_LEN = 500;

function normalizeDataExplorerSearch(search: string | null | undefined): string | null {
  if (search == null || typeof search !== "string") return null;
  const t = search.trim();
  if (t.length === 0) return null;
  return t.length > DATA_EXPLORER_SEARCH_MAX_LEN ? t.slice(0, DATA_EXPLORER_SEARCH_MAX_LEN) : t;
}

function buildDataExplorerSearchClause(
  schema: DataExplorerColumn[],
  pattern: string
): { whereSql: string; params: unknown[] } {
  if (schema.length === 0) {
    return { whereSql: "0", params: [] };
  }
  const parts = schema.map((c) => `CAST(${c.name} AS TEXT) LIKE ?`);
  const params = schema.map(() => pattern);
  return { whereSql: `(${parts.join(" OR ")})`, params };
}

export function getDataExplorerRows(
  tableName: string,
  limit: number,
  offset: number,
  search?: string | null
): Record<string, unknown>[] {
  validateTableName(tableName);
  const lim = Math.min(Math.max(1, limit), 500);
  const off = Math.max(0, offset);
  const q = normalizeDataExplorerSearch(search);
  if (!q) {
    const stmt = db.prepare(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`);
    return stmt.all(lim, off) as Record<string, unknown>[];
  }
  const schema = getDataExplorerTableSchema(tableName);
  const { whereSql, params } = buildDataExplorerSearchClause(schema, `%${q}%`);
  const sql = `SELECT * FROM ${tableName} WHERE ${whereSql} LIMIT ? OFFSET ?`;
  const stmt = db.prepare(sql);
  return stmt.all(...params, lim, off) as Record<string, unknown>[];
}

export function getDataExplorerRowCount(tableName: string, search?: string | null): number {
  validateTableName(tableName);
  const q = normalizeDataExplorerSearch(search);
  if (!q) {
    const row = db.prepare(`SELECT COUNT(*) as c FROM ${tableName}`).get() as { c: number };
    return row.c;
  }
  const schema = getDataExplorerTableSchema(tableName);
  const { whereSql, params } = buildDataExplorerSearchClause(schema, `%${q}%`);
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM ${tableName} WHERE ${whereSql}`)
    .get(...params) as { c: number };
  return row.c;
}

export function insertDataExplorerRow(tableName: string, data: Record<string, unknown>): number {
  validateTableName(tableName);
  const schema = getDataExplorerTableSchema(tableName);
  const cols = schema.filter(
    (c) => c.name in data && data[c.name] !== undefined && data[c.name] !== ""
  );
  if (cols.length === 0) throw new Error("No columns to insert");
  const colNames = cols.map((c) => c.name);
  const placeholders = colNames.map(() => "?").join(", ");
  const values = colNames.map((n) => data[n]);
  const sql = `INSERT INTO ${tableName} (${colNames.join(", ")}) VALUES (${placeholders})`;
  const result = db.prepare(sql).run(...values);
  return result.lastInsertRowid as number;
}

export function updateDataExplorerRow(
  tableName: string,
  pk: Record<string, unknown>,
  data: Record<string, unknown>
): number {
  validateTableName(tableName);
  const schema = getDataExplorerTableSchema(tableName);
  const pkCols = schema.filter((c) => c.pk).map((c) => c.name);
  if (pkCols.length === 0) throw new Error("Table has no primary key");
  for (const c of pkCols) {
    if (!(c in pk)) throw new Error(`Primary key ${c} required`);
  }
  const setCols = schema.filter((c) => !c.pk && c.name in data).map((c) => c.name);
  if (setCols.length === 0) throw new Error("No columns to update");
  const setClause = setCols.map((c) => `${c} = ?`).join(", ");
  const whereClause = pkCols.map((c) => `${c} = ?`).join(" AND ");
  const values = [...setCols.map((n) => data[n]), ...pkCols.map((n) => pk[n])];
  const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
  const result = db.prepare(sql).run(...values);
  return result.changes;
}

export function deleteDataExplorerRow(tableName: string, pk: Record<string, unknown>): number {
  validateTableName(tableName);
  const schema = getDataExplorerTableSchema(tableName);
  const pkCols = schema.filter((c) => c.pk).map((c) => c.name);
  if (pkCols.length === 0) throw new Error("Table has no primary key");
  for (const c of pkCols) {
    if (!(c in pk)) throw new Error(`Primary key ${c} required`);
  }
  const whereClause = pkCols.map((c) => `${c} = ?`).join(" AND ");
  const values = pkCols.map((n) => pk[n]);
  const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
  const result = db.prepare(sql).run(...values);
  return result.changes;
}

export function runSql(
  query: string
):
  | { type: "select"; columns: string[]; rows: Record<string, unknown>[] }
  | { type: "write"; changes: number; lastInsertRowid: number } {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Empty query");
  }
  const stmt = db.prepare(trimmed);
  const isSelect = /^\s*SELECT\b/i.test(trimmed);
  if (isSelect) {
    const rows = stmt.all() as Record<string, unknown>[];
    const columns = stmt.columns().map((c) => c.name);
    return { type: "select", columns, rows };
  }
  const result = stmt.run();
  return {
    type: "write",
    changes: result.changes,
    lastInsertRowid: Number(result.lastInsertRowid),
  };
}

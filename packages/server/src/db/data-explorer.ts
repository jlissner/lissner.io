import { execute, queryAll, queryOne } from "./client.js";

const VALID_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateTableName(name: string): void {
  if (!VALID_IDENT.test(name)) throw new Error("Invalid table name");
}

export async function getDataExplorerTables(): Promise<string[]> {
  const rows = await queryAll<{ name: string }>(
    `SELECT table_name as name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );
  return rows.map((r) => r.name);
}

type DataExplorerColumn = {
  name: string;
  type: string;
  notnull: number;
  pk: number;
};

export async function getDataExplorerTableSchema(
  tableName: string,
): Promise<DataExplorerColumn[]> {
  validateTableName(tableName);
  const rows = await queryAll<{
    name: string;
    type: string;
    notnull: boolean | number;
    pk: number | string;
  }>(
    `SELECT c.column_name as name, c.data_type as type,
            CASE WHEN c.is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
            CASE WHEN EXISTS (
              SELECT 1 FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
               AND tc.table_schema = kcu.table_schema
              WHERE tc.table_schema = 'public' AND tc.table_name = ?
                AND tc.constraint_type = 'PRIMARY KEY'
                AND kcu.column_name = c.column_name
            ) THEN 1 ELSE 0 END as pk
     FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = ?
     ORDER BY c.ordinal_position`,
    [tableName, tableName],
  );
  if (rows.length === 0) throw new Error("Table not found");
  return rows.map((r) => ({
    name: r.name,
    type: r.type,
    notnull: Number(r.notnull),
    pk: Number(r.pk),
  }));
}

const DATA_EXPLORER_SEARCH_MAX_LEN = 500;

function normalizeDataExplorerSearch(
  search: string | null | undefined,
): string | null {
  if (search == null || typeof search !== "string") return null;
  const t = search.trim();
  if (t.length === 0) return null;
  return t.length > DATA_EXPLORER_SEARCH_MAX_LEN
    ? t.slice(0, DATA_EXPLORER_SEARCH_MAX_LEN)
    : t;
}

function buildDataExplorerSearchClause(
  schema: DataExplorerColumn[],
  pattern: string,
): { whereSql: string; params: unknown[] } {
  if (schema.length === 0) {
    return { whereSql: "0", params: [] };
  }
  const parts = schema.map((c) => `CAST(${c.name} AS TEXT) LIKE ?`);
  const params = schema.map(() => pattern);
  return { whereSql: `(${parts.join(" OR ")})`, params };
}

export async function getDataExplorerRows(
  tableName: string,
  limit: number,
  offset: number,
  search?: string | null,
): Promise<Record<string, unknown>[]> {
  validateTableName(tableName);
  const lim = Math.min(Math.max(1, limit), 500);
  const off = Math.max(0, offset);
  const q = normalizeDataExplorerSearch(search);
  if (!q) {
    return queryAll<Record<string, unknown>>(
      `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`,
      [lim, off],
    );
  }
  const schema = await getDataExplorerTableSchema(tableName);
  const { whereSql, params } = buildDataExplorerSearchClause(schema, `%${q}%`);
  return queryAll<Record<string, unknown>>(
    `SELECT * FROM ${tableName} WHERE ${whereSql} LIMIT ? OFFSET ?`,
    [...params, lim, off],
  );
}

export async function getDataExplorerRowCount(
  tableName: string,
  search?: string | null,
): Promise<number> {
  validateTableName(tableName);
  const q = normalizeDataExplorerSearch(search);
  if (!q) {
    const row = await queryOne<{ c: number | string }>(
      `SELECT COUNT(*) as c FROM ${tableName}`,
    );
    return Number(row?.c ?? 0);
  }
  const schema = await getDataExplorerTableSchema(tableName);
  const { whereSql, params } = buildDataExplorerSearchClause(schema, `%${q}%`);
  const row = await queryOne<{ c: number | string }>(
    `SELECT COUNT(*) as c FROM ${tableName} WHERE ${whereSql}`,
    params,
  );
  return Number(row?.c ?? 0);
}

export async function insertDataExplorerRow(
  tableName: string,
  data: Record<string, unknown>,
): Promise<number> {
  validateTableName(tableName);
  const schema = await getDataExplorerTableSchema(tableName);
  const cols = schema.filter(
    (c) => c.name in data && data[c.name] !== undefined && data[c.name] !== "",
  );
  if (cols.length === 0) throw new Error("No columns to insert");
  const colNames = cols.map((c) => c.name);
  const placeholders = colNames.map(() => "?").join(", ");
  const values = colNames.map((n) => data[n]);
  const sql = `INSERT INTO ${tableName} (${colNames.join(", ")}) VALUES (${placeholders})`;
  const result = await execute(sql, values);
  return result.lastId ?? 0;
}

export async function updateDataExplorerRow(
  tableName: string,
  pk: Record<string, unknown>,
  data: Record<string, unknown>,
): Promise<number> {
  validateTableName(tableName);
  const schema = await getDataExplorerTableSchema(tableName);
  const pkCols = schema.filter((c) => c.pk).map((c) => c.name);
  if (pkCols.length === 0) throw new Error("Table has no primary key");
  for (const c of pkCols) {
    if (!(c in pk)) throw new Error(`Primary key ${c} required`);
  }
  const setCols = schema
    .filter((c) => !c.pk && c.name in data)
    .map((c) => c.name);
  if (setCols.length === 0) throw new Error("No columns to update");
  const setClause = setCols.map((c) => `${c} = ?`).join(", ");
  const whereClause = pkCols.map((c) => `${c} = ?`).join(" AND ");
  const values = [...setCols.map((n) => data[n]), ...pkCols.map((n) => pk[n])];
  const result = await execute(
    `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`,
    values,
  );
  return result.changes;
}

export async function deleteDataExplorerRow(
  tableName: string,
  pk: Record<string, unknown>,
): Promise<number> {
  validateTableName(tableName);
  const schema = await getDataExplorerTableSchema(tableName);
  const pkCols = schema.filter((c) => c.pk).map((c) => c.name);
  if (pkCols.length === 0) throw new Error("Table has no primary key");
  for (const c of pkCols) {
    if (!(c in pk)) throw new Error(`Primary key ${c} required`);
  }
  const whereClause = pkCols.map((c) => `${c} = ?`).join(" AND ");
  const values = pkCols.map((n) => pk[n]);
  const result = await execute(
    `DELETE FROM ${tableName} WHERE ${whereClause}`,
    values,
  );
  return result.changes;
}

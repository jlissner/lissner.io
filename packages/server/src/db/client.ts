/**
 * Async media DB access (Postgres). SQL may use `?` placeholders; rewritten to `$n`.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type pg from "pg";
import { getMediaPool } from "./pg-media.js";

export const galleryVisibleSql = (): string =>
  "COALESCE(hide_from_gallery, false) IS NOT TRUE";

/** Rewrite `?` placeholders to `$1`, `$2`, … for node-pg. */
const toPgParams = (sql: string): string => {
  const acc = { n: 0 };
  return sql.replace(/\?/g, () => {
    acc.n += 1;
    return `$${acc.n}`;
  });
};

export type ExecResult = { changes: number; lastId: number | null };

/** Per-async-context transaction client — never share across concurrent requests. */
const txAls = new AsyncLocalStorage<pg.PoolClient>();

/** pg returns Date for timestamptz — normalize to ISO strings for callers. */
const pgCell = (v: unknown): unknown =>
  v instanceof Date ? v.toISOString() : v;

const pgRow = <T>(row: T): T =>
  Object.fromEntries(
    Object.entries(row as Record<string, unknown>).map(([k, v]) => [
      k,
      pgCell(v),
    ]),
  ) as T;

const querier = (): pg.Pool | pg.PoolClient =>
  txAls.getStore() ?? getMediaPool();

export const queryAll = async <T>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> => {
  const result = await querier().query(toPgParams(sql), params);
  return result.rows.map((row) => pgRow(row)) as T[];
};

export const queryOne = async <T>(
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> => {
  const rows = await queryAll<T>(sql, params);
  return rows[0];
};

export const execute = async (
  sql: string,
  params: unknown[] = [],
): Promise<ExecResult> => {
  const pgSql = toPgParams(sql);
  const withReturning =
    /INSERT\s+INTO/i.test(pgSql) &&
    !/RETURNING/i.test(pgSql) &&
    /\busers\b|\bauth_whitelist\b/i.test(pgSql)
      ? `${pgSql.trim().replace(/;$/, "")} RETURNING id`
      : pgSql;
  const result = await querier().query(withReturning, params);
  const row = result.rows[0] as { id?: number } | undefined;
  return {
    changes: result.rowCount ?? 0,
    lastId: row?.id != null ? Number(row.id) : null,
  };
};

export const execScript = async (sql: string): Promise<void> => {
  await querier().query(sql);
};

export const withTransaction = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (txAls.getStore()) return fn();

  const client = await getMediaPool().connect();
  try {
    return await txAls.run(client, async () => {
      await client.query("BEGIN");
      try {
        const value = await fn();
        await client.query("COMMIT");
        return value;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
  } finally {
    client.release();
  }
};

/**
 * Build a full Postgres URL from a server URL (no database path) + database name.
 *
 * @example
 * buildDatabaseUrl("postgres://u:p@host:5433?sslmode=disable", "media")
 * // → "postgres://u:p@host:5433/media?sslmode=disable"
 */
export const buildDatabaseUrl = (
  serverUrl: string,
  databaseName: string,
): string => {
  const name = databaseName.trim();
  if (!name) {
    throw new Error("database name must be non-empty");
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`invalid database name: ${databaseName}`);
  }

  const trimmed = serverUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`invalid POSTGRES_SERVER_URL: ${serverUrl}`);
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(
      `POSTGRES_SERVER_URL must use postgres:// or postgresql:// (got ${parsed.protocol})`,
    );
  }

  const pathDb = parsed.pathname.replace(/^\//, "").trim();
  if (pathDb.length > 0) {
    throw new Error(
      `POSTGRES_SERVER_URL must not include a database path (found "/${pathDb}"). Set GRAPHQL_DATABASE_NAME / MEDIA_DATABASE_NAME instead.`,
    );
  }

  parsed.pathname = `/${name}`;
  return parsed.toString();
};

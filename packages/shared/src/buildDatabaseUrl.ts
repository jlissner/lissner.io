type DatabaseParameters = {
  user: string;
  password: string;
  host: string;
  port: string;
  databaseName: string;
};
/**
 * Build a Postgres URL from discrete connection parts (password is URI-encoded).
 *
 * @example
 * buildDatabaseUrl({ user: "u", password: "p#1", host: "127.0.0.1", port: "5432", databaseName: "media" })
 * // → "postgres://u:p%231@127.0.0.1:5432/media"
 */
export function buildDatabaseUrl({
  user,
  password,
  host,
  port,
  databaseName,
}: DatabaseParameters): string {
  return `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${databaseName}`;
}

/** Dev-only tooling flags (SQL / Data explorer). */
export function isSqlExplorerEnabled(): boolean {
  return process.env.SQL_EXPLORER_ENABLED === "true" && process.env.NODE_ENV !== "production";
}

export function isDataExplorerEnabled(): boolean {
  return process.env.DATA_EXPLORER_ENABLED === "true" && process.env.NODE_ENV !== "production";
}

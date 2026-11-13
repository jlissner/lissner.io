import { UseQueryResult } from "@tanstack/react-query";

export function getStatus(query: UseQueryResult<{ ok: boolean }>) {
  if (query.isLoading) return "-";

  return query.data?.ok ? "✅" : "❌";
}

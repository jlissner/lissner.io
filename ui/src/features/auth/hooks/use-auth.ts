import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch, apiJson } from "@/api/client";

export interface AuthUser {
  id: number;
  email: string;
  isAdmin: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      try {
        const config = await apiJson<{ authEnabled: boolean }>("auth/config");
        const meRes = await apiFetch("auth/me");
        const user = meRes.ok ? ((await meRes.json()) as AuthUser) : null;
        return { authEnabled: config.authEnabled === true, user };
      } catch {
        return { authEnabled: false, user: null as AuthUser | null };
      }
    },
    retry: false,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["auth"] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    const res = await apiFetch("auth/logout", { method: "POST" });
    if (!res.ok) {
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
  }, [queryClient]);

  const authEnabled = query.data?.authEnabled ?? null;
  const user = query.data?.user ?? null;
  const loading = query.isLoading;
  const needsLogin = authEnabled === true && !user;

  return { authEnabled, user, loading, needsLogin, logout, refresh };
}

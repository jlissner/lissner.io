import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/api";

interface AuthUser {
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
        const meRes = await apiFetch("auth/me");
        const user = meRes.ok ? ((await meRes.json()) as AuthUser) : null;

        return user;
      } catch {
        return null;
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

  const user = query.data ?? null;
  const loading = query.isLoading;

  return { user, loading, logout, refresh };
}

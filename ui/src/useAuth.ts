import { useCallback, useEffect, useState } from "react";

export interface AuthUser {
  id: number;
  email: string;
  isAdmin: boolean;
}

export function useAuth() {
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAuth = useCallback(async () => {
    try {
      const [configRes, meRes] = await Promise.all([
        fetch("/api/auth/config", { credentials: "include" }),
        fetch("/api/auth/me", { credentials: "include" }),
      ]);

      const config = await configRes.json().catch(() => ({}));
      setAuthEnabled(config.authEnabled === true);

      if (meRes.ok) {
        const me = await meRes.json();
        setUser(me);
      } else {
        setUser(null);
      }
    } catch {
      setAuthEnabled(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuth();
  }, [fetchAuth]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const needsLogin = authEnabled && !user;

  return { authEnabled, user, loading, needsLogin, logout, refresh: fetchAuth };
}

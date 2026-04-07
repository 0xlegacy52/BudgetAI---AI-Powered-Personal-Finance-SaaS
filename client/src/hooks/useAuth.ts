import { useState, useEffect, useCallback } from "react";
import { api, setTokens, clearTokens, getUser, setUser } from "@/lib/api";

export function useAuth() {
  const [user, setUserState] = useState<any>(getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getUser();
    if (stored) {
      api("/auth/me")
        .then((data) => {
          setUserState(data.user);
          setUser(data.user);
        })
        .catch(() => {
          clearTokens();
          setUserState(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setUserState(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setUserState(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    clearTokens();
    setUserState(null);
  }, []);

  return { user, loading, login, register, logout, isAuthenticated: !!user };
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";
import { clearToken, getToken, setToken as persistToken, setUnauthorizedHandler } from "../api/client";
import type { UserRead } from "../types/api";

interface AuthState {
  user: UserRead | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
      setStatus("anonymous");
    });
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus("anonymous");
      return;
    }
    authApi
      .me()
      .then((u) => {
        setUser(u);
        setStatus("authenticated");
      })
      .catch(() => {
        clearToken();
        setStatus("anonymous");
      });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      status,
      login: async (email, password) => {
        const token = await authApi.login(email, password);
        persistToken(token.access_token);
        const me = await authApi.me();
        setUser(me);
        setStatus("authenticated");
      },
      register: async (email, password, fullName) => {
        await authApi.register({ email, password, full_name: fullName || undefined });
        const token = await authApi.login(email, password);
        persistToken(token.access_token);
        const me = await authApi.me();
        setUser(me);
        setStatus("authenticated");
      },
      logout: () => {
        clearToken();
        setUser(null);
        setStatus("anonymous");
      },
    }),
    [user, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import { apiClient, BASE_URL } from "./client";
import type { Token, UserRead } from "../types/api";

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<UserRead>("/api/auth/register", payload, { auth: false }),

  /** The backend's /api/auth/login is an OAuth2 password form, not JSON. */
  login: async (email: string, password: string): Promise<Token> => {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(new URL("api/auth/login", BASE_URL + "/"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message ?? "Could not sign in.");
    }
    return data as Token;
  },

  me: () => apiClient.get<UserRead>("/api/auth/me"),
};

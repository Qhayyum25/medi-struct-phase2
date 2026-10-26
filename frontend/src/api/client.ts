import type { ErrorResponse } from "../types/api";

const BASE_URL: string = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "medistruct.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Thrown for every non-2xx response. Carries the backend's own error code/message
 * (see backend `app/core/errors.py`) so the UI can react precisely (e.g. 503
 * MODEL_UNAVAILABLE) without ever showing a raw stack trace. */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: ErrorResponse["error"]["details"];

  constructor(status: number, code: string, message: string, details?: ErrorResponse["error"]["details"]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends Error {
  constructor() {
    super("Could not reach the Medistruct server.");
    this.name = "NetworkError";
  }
}

let onUnauthorized: (() => void) | null = null;
/** Registered once by AuthContext so a 401 from anywhere logs the user out. */
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean; // default true
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.replace(/^\//, ""), BASE_URL.endsWith("/") ? BASE_URL : BASE_URL + "/");
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", json, formData, query, auth = true, signal } = options;
  const headers: Record<string, string> = {};
  if (json !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: formData ?? (json !== undefined ? JSON.stringify(json) : undefined),
      signal,
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401 && auth) onUnauthorized?.();
    const err = (body as ErrorResponse | null)?.error;
    throw new ApiError(
      response.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? `Request failed with status ${response.status}.`,
      err?.details ?? undefined,
    );
  }
  return body as T;
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions["query"], opts: Partial<RequestOptions> = {}) =>
    request<T>(path, { ...opts, method: "GET", query }),
  post: <T>(path: string, json?: unknown, opts: Partial<RequestOptions> = {}) =>
    request<T>(path, { ...opts, method: "POST", json }),
  postForm: <T>(path: string, formData: FormData, opts: Partial<RequestOptions> = {}) =>
    request<T>(path, { ...opts, method: "POST", formData }),
  delete: <T>(path: string, opts: Partial<RequestOptions> = {}) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

export { BASE_URL };

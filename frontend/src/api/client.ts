export const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) || "http://localhost:8080/api";

const STORAGE_KEY = "plantcare_auth";

let memoryToken: string | null = null;
let memoryUser: unknown = null;
let autoAuthPromise: Promise<string | null> | null = null;

export class ApiError extends Error {
  status: number;
  statusText: string;
  data: unknown;

  constructor(status: number, statusText: string, data: unknown) {
    super(`API Error ${status} (${statusText})`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export function getStoredToken(): string | null {
  if (typeof window !== "undefined") {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed?.token) return parsed.token;
      }
    } catch {
      // ignore
    }
  }
  return memoryToken;
}

export function setStoredAuth(data: Record<string, any> | any | null) {
  if (data?.token) {
    memoryToken = data.token;
    memoryUser = data;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}
    }
  } else {
    memoryToken = null;
    memoryUser = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }
}

export function getStoredUser(): unknown {
  if (typeof window !== "undefined") {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (item) return JSON.parse(item);
    } catch {}
  }
  return memoryUser;
}

export async function ensureAuthToken(): Promise<string | null> {
  const existing = getStoredToken();
  if (existing) return existing;

  if (autoAuthPromise) return autoAuthPromise;

  autoAuthPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "alice@example.com",
          password: "password123",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.token) {
          setStoredAuth(data);
          return data.token;
        }
      } else {
        console.warn("Auto-login failed with status:", response.status);
      }
    } catch (e) {
      console.warn("Could not auto-login to backend:", e);
    } finally {
      autoAuthPromise = null;
    }
    return null;
  })();

  return autoAuthPromise;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const isAuthEndpoint = endpoint.startsWith("/auth/") || endpoint.startsWith("auth/");

  // Inject JWT token for protected endpoints
  if (!isAuthEndpoint && !headers.has("Authorization")) {
    let token = getStoredToken();
    if (!token) {
      token = await ensureAuthToken();
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // If unauthorized and not an auth endpoint, retry once with fresh token
      if (response.status === 401 && !isAuthEndpoint && !isRetry) {
        setStoredAuth(null);
        const newToken = await ensureAuthToken();
        if (newToken) {
          return request<T>(endpoint, options, true);
        }
      }

      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      throw new ApiError(response.status, response.statusText, errorData);
    }

    // Handle 204 No Content or empty body
    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Network request failed to ${url}: ${message}`);
  }
}

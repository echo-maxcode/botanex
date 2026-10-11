import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  API_BASE_URL,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  ensureAuthToken,
} from "@/api/client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  memberSince: string;
  ecoPoints: number;
  badgeCount: number;
  plantCount: number;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  /** fetch wrapper that attaches `Authorization: Bearer <token>` */
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapBackendToAuthUser(data: Record<string, any>): AuthUser {
  return {
    id: String(data["userId"] ?? data["id"] ?? "1"),
    name: (data["name"] as string) || "Alice Green",
    email: (data["email"] as string) || "alice@example.com",
    memberSince: "Joined recently",
    ecoPoints: typeof data["ecoPoints"] === "number" ? data["ecoPoints"] : 45,
    badgeCount: 3,
    plantCount: 3,
  };
}

async function postJson(endpoint: string, body: unknown) {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/api") ? endpoint.slice(4) : endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok || !data["token"]) {
    throw new Error((data["error"] as string) ?? "Something went wrong. Please try again.");
  }
  const user = mapBackendToAuthUser(data);
  return { token: data["token"] as string, user, raw: data };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = getStoredUser() as Record<string, any> | null;
    return stored ? mapBackendToAuthUser(stored) : null;
  });

  useEffect(() => {
    // If no active token, ensure default auth so live sensor data and backend APIs work smoothly
    if (!token) {
      ensureAuthToken().then((tok) => {
        if (tok) {
          setToken(tok);
          const stored = getStoredUser() as Record<string, any> | null;
          if (stored) {
            setUser(mapBackendToAuthUser(stored));
          }
        }
      });
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await postJson("/auth/login", { email, password });
    setStoredAuth(result.raw);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await postJson("/auth/register", { name, email, password });
    setStoredAuth(result.raw);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    setStoredAuth(null);
    setToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback(
    (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
    [token],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      authFetch,
    }),
    [token, user, login, register, logout, authFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

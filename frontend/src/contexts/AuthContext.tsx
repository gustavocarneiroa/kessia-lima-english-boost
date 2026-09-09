import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";

export type Role = "teacher" | "student";

interface Me {
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ firstLogin: boolean }>;
  loginWithDevice: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const me = await api.get<Me>("/api/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<Me & { firstLogin: boolean }>("/api/auth/login", { email, password });
    setUser({ email: res.email, role: res.role });
    return { firstLogin: res.firstLogin };
  }

  async function loginWithDevice(email: string) {
    const { startAuthentication } = await import("@simplewebauthn/browser");
    const options = await api.post<Parameters<typeof startAuthentication>[0]["optionsJSON"]>(
      "/api/webauthn/login-options",
      { email },
    );
    const response = await startAuthentication({ optionsJSON: options });
    const res = await api.post<Me>("/api/webauthn/login-verify", { email, response });
    setUser(res);
  }

  async function logout() {
    await api.post("/api/auth/logout");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithDevice, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

export { ApiError };

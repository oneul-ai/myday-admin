import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { googleLogout } from "@react-oauth/google";

interface AdminUser {
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (credential: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_token");
    if (saved) {
      try {
        const payload = decodeJwtPayload(saved);
        const exp = (payload.exp as number) * 1000;
        if (Date.now() < exp) {
          setToken(saved);
          setUser({
            email: payload.email as string,
            name: payload.name as string,
            picture: payload.picture as string,
          });
        } else {
          sessionStorage.removeItem("admin_token");
        }
      } catch {
        sessionStorage.removeItem("admin_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((credential: string) => {
    const payload = decodeJwtPayload(credential);
    setToken(credential);
    setUser({
      email: payload.email as string,
      name: payload.name as string,
      picture: payload.picture as string,
    });
    sessionStorage.setItem("admin_token", credential);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("admin_token");
    googleLogout();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

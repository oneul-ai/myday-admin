import { useCallback, useState, type ReactNode } from "react";
import { googleLogout } from "@react-oauth/google";
import { AuthContext, type AdminUser } from "./useAuth";

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

function readSavedAuth(): { user: AdminUser | null; token: string | null } {
  const saved = sessionStorage.getItem("admin_token");
  if (!saved) return { user: null, token: null };
  try {
    const payload = decodeJwtPayload(saved);
    const exp = (payload.exp as number) * 1000;
    if (Date.now() < exp) {
      return {
        token: saved,
        user: {
          email: payload.email as string,
          name: payload.name as string,
          picture: payload.picture as string,
        },
      };
    }
  } catch {
    // fall through to cleanup
  }
  sessionStorage.removeItem("admin_token");
  return { user: null, token: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(readSavedAuth);

  const login = useCallback((credential: string) => {
    const payload = decodeJwtPayload(credential);
    setAuth({
      token: credential,
      user: {
        email: payload.email as string,
        name: payload.name as string,
        picture: payload.picture as string,
      },
    });
    sessionStorage.setItem("admin_token", credential);
  }, []);

  const logout = useCallback(() => {
    setAuth({ user: null, token: null });
    sessionStorage.removeItem("admin_token");
    googleLogout();
  }, []);

  return (
    <AuthContext.Provider value={{ user: auth.user, token: auth.token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

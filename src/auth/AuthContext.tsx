import { useCallback, useState, type ReactNode } from "react";
import { googleLogout } from "@react-oauth/google";
import client from "../api/client";
import { AuthContext, type AdminUser } from "./useAuth";

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

function readSavedAuth(): { user: AdminUser | null; token: string | null } {
  // 이전 버전은 sessionStorage 에 저장했다 — 남아있으면 localStorage 로 이전.
  const legacy = sessionStorage.getItem("admin_token");
  if (legacy) {
    sessionStorage.removeItem("admin_token");
    if (!localStorage.getItem("admin_token")) localStorage.setItem("admin_token", legacy);
  }
  const saved = localStorage.getItem("admin_token");
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
  localStorage.removeItem("admin_token");
  return { user: null, token: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(readSavedAuth);

  const login = useCallback(async (credential: string) => {
    // 구글 ID 토큰(만료 1시간 고정)을 서버가 발급한 장기 세션 토큰으로 교환.
    const { data } = await client.post("/auth/login", { credential });
    setAuth({
      token: data.token,
      user: {
        email: data.admin.email,
        name: data.admin.name,
        picture: data.admin.picture,
      },
    });
    localStorage.setItem("admin_token", data.token);
  }, []);

  const logout = useCallback(() => {
    setAuth({ user: null, token: null });
    localStorage.removeItem("admin_token");
    googleLogout();
  }, []);

  return (
    <AuthContext.Provider value={{ user: auth.user, token: auth.token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

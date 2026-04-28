import { createContext, useContext } from "react";

export interface AdminUser {
  email: string;
  name: string;
  picture: string;
}

export interface AuthState {
  user: AdminUser | null;
  token: string | null;
  login: (credential: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

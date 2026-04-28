import { Navigate, useNavigate } from "react-router-dom";
import { message } from "antd";
import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useMe } from "./useMe";
import type { ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isError, error } = useMe();

  useEffect(() => {
    if (!isError) return;
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      message.error("Not an authorized admin");
      logout();
      navigate("/login", { replace: true });
    }
  }, [isError, error, logout, navigate]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

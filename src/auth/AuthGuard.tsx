import { Navigate, useNavigate } from "react-router-dom";
import { Spin, message } from "antd";
import { useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useMe } from "./useMe";
import type { ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
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

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

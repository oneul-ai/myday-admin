import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import type { ReactNode } from "react";
import { useMe } from "./useMe";

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin />
      </div>
    );
  }

  if (me?.role !== "super_admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

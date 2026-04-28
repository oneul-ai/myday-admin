import { Card, Typography } from "antd";
import { GoogleLogin } from "@react-oauth/google";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function LoginPage() {
  const { user, login } = useAuth();

  if (user) return <Navigate to="/" replace />;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f5f5f5",
      }}
    >
      <Card style={{ width: 400, textAlign: "center" }}>
        <Typography.Title level={3} style={{ marginBottom: 32 }}>
          MyDay Admin
        </Typography.Title>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={(res) => {
              if (res.credential) login(res.credential);
            }}
            onError={() => {}}
            size="large"
            width="352"
          />
        </div>
      </Card>
    </div>
  );
}

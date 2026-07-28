import { Card, Typography, message } from "antd";
import { isAxiosError } from "axios";
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
              if (!res.credential) return;
              login(res.credential).catch((err) => {
                const denied = isAxiosError(err) && err.response?.status === 403;
                message.error(denied ? "어드민 권한이 없는 계정입니다." : "로그인에 실패했습니다.");
              });
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

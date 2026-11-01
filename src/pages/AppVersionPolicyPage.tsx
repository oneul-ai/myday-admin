import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AppPlatform,
  type AppVersionPolicySettings,
  getAppVersionPolicy,
  updateAppVersionPolicy,
} from "../api/appSettings";

const PLATFORMS: { key: AppPlatform; title: string; storeName: string }[] = [
  { key: "ios", title: "iOS", storeName: "App Store" },
  { key: "android", title: "Android", storeName: "Google Play" },
];

// "1.2" / "1.2.3" — 서버 파서(_parse_version)와 같은 형태만 허용.
const VERSION_RE = /^\d+(\.\d+)*$/;

type FormValues = Record<
  AppPlatform,
  { min_supported_version?: string | null; store_url?: string | null }
>;

export default function AppVersionPolicyPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();

  const { data, isLoading } = useQuery({
    queryKey: ["app-version-policy"],
    queryFn: getAppVersionPolicy,
  });

  const updateMutation = useMutation({
    mutationFn: updateAppVersionPolicy,
    onSuccess: (settings) => {
      queryClient.setQueryData(["app-version-policy"], settings);
      message.success("저장되었습니다");
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      message.error(detail ?? "저장 실패");
    },
  });

  const handleSave = (values: FormValues) => {
    const body: Parameters<typeof updateAppVersionPolicy>[0] = {};
    for (const { key } of PLATFORMS) {
      const entry = values[key];
      // 비운 입력은 null(미설정) 로 — 서버가 폴백을 적용한다.
      body[key] = {
        min_supported_version: entry?.min_supported_version?.trim() || null,
        store_url: entry?.store_url?.trim() || null,
      };
    }
    updateMutation.mutate(body);
  };

  const effectiveMinimum = (
    settings: AppVersionPolicySettings,
    platform: AppPlatform,
  ) =>
    settings[platform].min_supported_version ??
    settings.fallback.min_supported_version;

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
        앱 버전 정책 (강제 업데이트)
      </Typography.Title>
      <Card style={{ maxWidth: 640 }} loading={isLoading}>
        {data && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{ ios: data.ios, android: data.android }}
          >
            <Typography.Paragraph type="secondary">
              앱 실행 시 /awake 응답 update 로 내려가는 값입니다. 앱이 보낸
              버전(X-App-Version)이 플랫폼의 최소 지원 버전보다 낮으면
              force_update=true 와 스토어 URL 이 내려가고, 앱은 스토어로
              보내는 전체 화면 안내를 띄웁니다. 플랫폼은 X-Platform 헤더로
              구분하며(Android 앱이 보냄), 없으면 iOS 로 봅니다.
            </Typography.Paragraph>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="비워 둔 값에는 폴백이 적용됩니다"
              description={
                <>
                  최소 지원 버전을 비우면 서버 환경변수{" "}
                  <Typography.Text code>MIN_SUPPORTED_APP_VERSION</Typography.Text>
                  {" "}
                  {data.fallback.min_supported_version ? (
                    <>
                      (현재 <Tag>{data.fallback.min_supported_version}</Tag>)이
                      적용되고,
                    </>
                  ) : (
                    <>(현재 비어 있음 — 강제 업데이트 꺼짐)이 적용되고,</>
                  )}{" "}
                  스토어 URL 을 비우면 플랫폼 기본 스토어 페이지로 보냅니다.
                  두 플랫폼 값을 모두 넣었다면 환경변수는 지워도 됩니다.
                </>
              }
            />
            {PLATFORMS.map(({ key, title, storeName }) => (
              <Card
                key={key}
                size="small"
                title={title}
                style={{ marginBottom: 16 }}
                extra={
                  <Typography.Text type="secondary">
                    현재 적용 최소 버전:{" "}
                    {effectiveMinimum(data, key) ? (
                      <Tag color="blue">{effectiveMinimum(data, key)}</Tag>
                    ) : (
                      <Tag>없음</Tag>
                    )}
                  </Typography.Text>
                }
              >
                <Form.Item
                  name={[key, "min_supported_version"]}
                  label="최소 지원 버전"
                  extra="예: 2.0.0 — 이보다 낮은 버전의 앱은 강제 업데이트 대상이 됩니다. 비우면 환경변수 폴백."
                  rules={[
                    {
                      validator: (_, value?: string | null) =>
                        !value?.trim() || VERSION_RE.test(value.trim())
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error("1.2.3 처럼 숫자와 점으로만 입력하세요"),
                            ),
                    },
                  ]}
                >
                  <Input placeholder="2.0.0" allowClear />
                </Form.Item>
                <Form.Item
                  name={[key, "store_url"]}
                  label={`${storeName} URL`}
                  extra={`비우면 기본값: ${data.fallback.store_url[key]}`}
                  rules={[
                    {
                      validator: (_, value?: string | null) =>
                        !value?.trim() || /^https?:\/\//.test(value.trim())
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error("http(s):// 로 시작하는 URL 을 입력하세요"),
                            ),
                    },
                  ]}
                >
                  <Input placeholder={data.fallback.store_url[key]} allowClear />
                </Form.Item>
              </Card>
            ))}
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateMutation.isPending}
              >
                저장
              </Button>
            </Space>
          </Form>
        )}
      </Card>
    </>
  );
}

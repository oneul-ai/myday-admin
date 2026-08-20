import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AppLinksSettings,
  getAppLinksSettings,
  updateAppLinksSettings,
} from "../api/appSettings";
import { OVERRIDE_LOCALES_EN_BASE } from "../constants/locales";

const LINKS = [
  {
    name: "usage_guide",
    title: "이용가이드",
    extra: "앱의 이용가이드 진입점에서 여는 페이지 주소.",
  },
  {
    name: "release_notes",
    title: "업데이트 내역",
    extra: "앱의 업데이트 내역 진입점에서 여는 페이지 주소.",
  },
] as const;

// 폼에서는 모든 locale 필드를 노출하므로 localizations 에 빈 문자열이 섞인다 —
// 저장 시 채워진 항목만 서버 포맷({locale: url})으로 걸러 보낸다.
type AppLinksFormValues = Record<
  string,
  {
    url?: string | null;
    localizations?: Record<string, string | null | undefined>;
  }
>;

export default function AppLinksPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AppLinksFormValues>();

  const { data, isLoading } = useQuery({
    queryKey: ["app-links"],
    queryFn: getAppLinksSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateAppLinksSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["app-links"], settings);
      message.success("저장되었습니다");
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      message.error(detail ?? "저장 실패");
    },
  });

  const handleSave = (values: AppLinksFormValues) => {
    const body: Partial<AppLinksSettings> = {};
    for (const { name } of LINKS) {
      const entry = values[name];
      const localizations: Record<string, string> = {};
      for (const { code } of OVERRIDE_LOCALES_EN_BASE) {
        const url = entry?.localizations?.[code];
        if (url) localizations[code] = url;
      }
      body[name] = { url: entry?.url || null, localizations };
    }
    updateMutation.mutate(body);
  };

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
        앱 링크
      </Typography.Title>
      <Card style={{ maxWidth: 640 }} loading={isLoading}>
        {data && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={data}
          >
            <Typography.Paragraph type="secondary">
              앱 실행 시 /awake 응답 links 로 내려가는 주소들입니다. 앱 언어에
              해당하는 언어별 URL 이 있으면 그것이, 없으면 기본(영어) URL 이
              내려갑니다. 기본 URL 까지 비우면 null 로 내려가 앱에서 해당
              진입점을 숨길 수 있습니다.
            </Typography.Paragraph>
            {LINKS.map(({ name, title, extra }) => (
              <Card
                key={name}
                size="small"
                title={title}
                style={{ marginBottom: 16 }}
              >
                <Form.Item
                  name={[name, "url"]}
                  label="URL (기본 · 영어)"
                  extra={extra}
                >
                  <Input placeholder="https://…" />
                </Form.Item>
                {OVERRIDE_LOCALES_EN_BASE.map(({ code, label }) => (
                  <Form.Item
                    key={code}
                    name={[name, "localizations", code]}
                    label={label}
                    extra="비우면 기본(영어) URL 로 폴백합니다."
                  >
                    <Input placeholder="https://…" />
                  </Form.Item>
                ))}
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

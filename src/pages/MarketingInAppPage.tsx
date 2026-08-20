import {
  Button,
  Card,
  DatePicker,
  Form,
  type FormInstance,
  Input,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import {
  type MarketingInAppSetting,
  getMarketingInAppSetting,
  updateMarketingInAppSetting,
} from "../api/appSettings";
import { OVERRIDE_LOCALES } from "../constants/locales";

// Form 에서는 ends_at 을 DatePicker 값(Dayjs)으로 다루고, 저장/조회 시
// 서버 포맷(ISO 8601, offset 포함)과 상호 변환한다. localizations 는 폼에서
// 모든 locale 필드를 노출하므로 빈 문자열이 섞인 partial 형태가 된다 —
// 저장 시 image_url 이 채워진 항목만 서버 포맷으로 걸러 보낸다.
type MarketingInAppFormValues = Omit<
  MarketingInAppSetting,
  "ends_at" | "localizations"
> & {
  ends_at: Dayjs | null;
  localizations: Record<
    string,
    { image_url?: string | null; landing_url?: string | null } | undefined
  >;
};

function ImagePreview({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt="인앱 메시지 이미지 미리보기"
      style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 8 }}
    />
  );
}

function LocalizationFields({
  form,
  code,
  label,
}: {
  form: FormInstance<MarketingInAppFormValues>;
  code: string;
  label: string;
}) {
  const imagePreview = Form.useWatch(["localizations", code, "image_url"], form);
  return (
    <Card size="small" title={label} style={{ marginBottom: 12 }}>
      <Form.Item
        name={["localizations", code, "image_url"]}
        label="이미지 URL"
        extra="비우면 이 언어에는 기본(한국어) 이미지·랜딩이 그대로 내려갑니다."
      >
        <Input placeholder="https://…" />
      </Form.Item>
      <Form.Item
        name={["localizations", code, "landing_url"]}
        label="랜딩 URL (옵셔널)"
        dependencies={[["localizations", code, "image_url"]]}
        extra="이미지 URL 이 있을 때만 함께 적용됩니다. 비우면 이 언어에서는 이동 없는 노출 전용 카드가 됩니다 (기본 랜딩과 섞이지 않음)."
        rules={[
          {
            validator: (_: unknown, value: string | null) =>
              value &&
              !form.getFieldValue(["localizations", code, "image_url"])
                ? Promise.reject(
                    new Error("이미지 URL 없이 랜딩 URL 만 설정할 수 없습니다"),
                  )
                : Promise.resolve(),
          },
        ]}
      >
        <Input placeholder="https://…" />
      </Form.Item>
      {imagePreview && (
        <Form.Item label="이미지 미리보기" style={{ marginBottom: 0 }}>
          <ImagePreview url={imagePreview} />
        </Form.Item>
      )}
    </Card>
  );
}

export default function MarketingInAppPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<MarketingInAppFormValues>();
  const imagePreview = Form.useWatch("image_url", form);

  const { data, isLoading } = useQuery({
    queryKey: ["marketing-in-app"],
    queryFn: getMarketingInAppSetting,
  });

  const updateMutation = useMutation({
    mutationFn: updateMarketingInAppSetting,
    onSuccess: (setting) => {
      queryClient.setQueryData(["marketing-in-app"], setting);
      message.success("저장되었습니다");
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      message.error(detail ?? "저장 실패");
    },
  });

  const handleSave = (values: MarketingInAppFormValues) => {
    // image_url 이 채워진 언어만 오버라이드로 보낸다 — 서버는 image 없는
    // 항목을 400 으로 거부한다 (landing 만 채운 경우는 폼 validation 이 선차단).
    const localizations: MarketingInAppSetting["localizations"] = {};
    for (const { code } of OVERRIDE_LOCALES) {
      const entry = values.localizations?.[code];
      if (entry?.image_url) {
        localizations[code] = {
          image_url: entry.image_url,
          landing_url: entry.landing_url || null,
        };
      }
    }

    updateMutation.mutate({
      enabled: values.enabled,
      id: values.id || null,
      image_url: values.image_url || null,
      landing_url: values.landing_url || null,
      localizations,
      min_app_version: values.min_app_version || null,
      max_app_version: values.max_app_version || null,
      ends_at: values.ends_at ? values.ends_at.format() : null,
    });
  };

  const requiredWhenEnabled = {
    validator: (_: unknown, value: string | null) =>
      form.getFieldValue("enabled") && !value
        ? Promise.reject(new Error("노출 상태에서는 필수입니다"))
        : Promise.resolve(),
  };

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
        인앱 마케팅 메시지
      </Typography.Title>
      <Card style={{ maxWidth: 640 }} loading={isLoading}>
        {data && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{
              ...data,
              localizations: data.localizations ?? {},
              ends_at: data.ends_at ? dayjs(data.ends_at) : null,
            }}
          >
            <Form.Item
              name="enabled"
              label="노출"
              valuePropName="checked"
              extra="켜면 앱 실행 시 /awake 응답 marketing_in_app 으로 내려갑니다. 꺼져 있으면 null."
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="id"
              label="캠페인 ID"
              extra="클라이언트가 노출/닫음 이력을 구분하는 식별자. 언어와 무관하게 하나이며, 새 캠페인마다 바꿔주세요 (예: 2026-08-event)."
              rules={[requiredWhenEnabled]}
            >
              <Input placeholder="2026-08-event" />
            </Form.Item>
            <Form.Item
              name="image_url"
              label="이미지 URL (기본 · 한국어)"
              rules={[requiredWhenEnabled]}
            >
              <Input placeholder="https://…" />
            </Form.Item>
            <Form.Item
              name="landing_url"
              label="랜딩 URL (기본 · 한국어, 옵셔널)"
              extra="이미지 탭 시 이동할 주소. 비우면 탭해도 이동하지 않는 노출 전용 카드가 됩니다."
            >
              <Input placeholder="https://…" />
            </Form.Item>
            {imagePreview && (
              <Form.Item label="이미지 미리보기 (기본 · 한국어)">
                <ImagePreview url={imagePreview} />
              </Form.Item>
            )}
            <Typography.Title level={5} style={{ marginTop: 24 }}>
              언어별 설정 (옵셔널)
            </Typography.Title>
            <Typography.Paragraph type="secondary">
              앱 언어에 따라 이미지·랜딩 URL 을 다르게 내립니다 (캠페인 ID 는
              동일). 이미지 URL 을 채운 언어만 적용되고, 비운 언어는 기본
              (한국어) 값으로 폴백합니다.
            </Typography.Paragraph>
            {OVERRIDE_LOCALES.map(({ code, label }) => (
              <LocalizationFields
                key={code}
                form={form}
                code={code}
                label={label}
              />
            ))}
            <Typography.Title level={5} style={{ marginTop: 24 }}>
              노출 조건 (옵셔널)
            </Typography.Title>
            <Typography.Paragraph type="secondary">
              비워두면 제한 없이 노출됩니다. 조건은 서버가 앱 실행 시점에
              평가합니다 — 버전 조건이 걸려 있으면 버전을 보내지 않는 옛
              클라이언트에는 노출되지 않습니다.
            </Typography.Paragraph>
            <Space size="large" align="start">
              <Form.Item
                name="min_app_version"
                label="최소 앱 버전 (이상)"
                rules={[
                  {
                    pattern: /^\d+(\.\d+)*$/,
                    message: "1.2.3 형태로 입력하세요",
                  },
                ]}
              >
                <Input placeholder="2.0.0" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item
                name="max_app_version"
                label="최대 앱 버전 (이하)"
                rules={[
                  {
                    pattern: /^\d+(\.\d+)*$/,
                    message: "1.2.3 형태로 입력하세요",
                  },
                ]}
              >
                <Input placeholder="2.1.0" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item
                name="ends_at"
                label="노출 종료 일시"
                extra="이 시각이 지나면 자동으로 내려갑니다."
              >
                <DatePicker showTime format="YYYY-MM-DD HH:mm" />
              </Form.Item>
            </Space>
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

import {
  Button,
  Card,
  DatePicker,
  Form,
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

// Form 에서는 ends_at 을 DatePicker 값(Dayjs)으로 다루고, 저장/조회 시
// 서버 포맷(ISO 8601, offset 포함)과 상호 변환한다.
type MarketingInAppFormValues = Omit<MarketingInAppSetting, "ends_at"> & {
  ends_at: Dayjs | null;
};

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
    updateMutation.mutate({
      enabled: values.enabled,
      id: values.id || null,
      image_url: values.image_url || null,
      landing_url: values.landing_url || null,
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
              extra="클라이언트가 노출/닫음 이력을 구분하는 식별자. 새 캠페인마다 바꿔주세요 (예: 2026-08-event)."
              rules={[requiredWhenEnabled]}
            >
              <Input placeholder="2026-08-event" />
            </Form.Item>
            <Form.Item
              name="image_url"
              label="이미지 URL"
              rules={[requiredWhenEnabled]}
            >
              <Input placeholder="https://…" />
            </Form.Item>
            <Form.Item
              name="landing_url"
              label="랜딩 URL (옵셔널)"
              extra="이미지 탭 시 이동할 주소. 비우면 탭해도 이동하지 않는 노출 전용 카드가 됩니다."
            >
              <Input placeholder="https://…" />
            </Form.Item>
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
            {imagePreview && (
              <Form.Item label="이미지 미리보기">
                <img
                  src={imagePreview}
                  alt="인앱 메시지 이미지 미리보기"
                  style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 8 }}
                />
              </Form.Item>
            )}
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

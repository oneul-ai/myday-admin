import {
  Button,
  Card,
  Form,
  Input,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type MarketingInAppSetting,
  getMarketingInAppSetting,
  updateMarketingInAppSetting,
} from "../api/appSettings";

export default function MarketingInAppPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<MarketingInAppSetting>();
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

  const handleSave = (values: MarketingInAppSetting) => {
    updateMutation.mutate({
      enabled: values.enabled,
      id: values.id || null,
      image_url: values.image_url || null,
      landing_url: values.landing_url || null,
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
            initialValues={data}
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
              label="랜딩 URL"
              extra="이미지 탭 시 이동할 주소."
              rules={[requiredWhenEnabled]}
            >
              <Input placeholder="https://…" />
            </Form.Item>
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

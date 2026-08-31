import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  type FormInstance,
  Input,
  Popconfirm,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import {
  type MarketingCampaign,
  deleteMarketingCampaign,
  getMarketingCampaigns,
  upsertMarketingCampaign,
} from "../api/appSettings";
import { OVERRIDE_LOCALES } from "../constants/locales";

// Form 에서는 ends_at 을 DatePicker 값(Dayjs)으로 다루고, 저장/조회 시
// 서버 포맷(ISO 8601, offset 포함)과 상호 변환한다. localizations 는 폼에서
// 모든 locale 필드를 노출하므로 빈 문자열이 섞인 partial 형태가 된다 —
// 저장 시 image_url 이 채워진 항목만 서버 포맷으로 걸러 보낸다.
// id 는 기존 캠페인에서는 카드 타이틀로만 표시(수정 불가)하고 신규 작성
// 폼에서만 입력받는다.
type CampaignFormValues = Omit<
  MarketingCampaign,
  "id" | "ends_at" | "localizations"
> & {
  id?: string;
  ends_at: Dayjs | null;
  localizations: Record<
    string,
    { image_url?: string | null; landing_url?: string | null } | undefined
  >;
};

function errorDetail(err: unknown) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data
    ?.detail;
}

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
  form: FormInstance<CampaignFormValues>;
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

function CampaignEditor({
  campaign,
  onSaved,
}: {
  /** null 이면 신규 작성 폼 — 캠페인 ID 필드를 입력받는다. */
  campaign: MarketingCampaign | null;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CampaignFormValues>();
  const imagePreview = Form.useWatch("image_url", form);

  const upsertMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof upsertMarketingCampaign>[1];
    }) => upsertMarketingCampaign(id, body),
    onSuccess: (list) => {
      queryClient.setQueryData(["marketing-in-app"], list);
      message.success("저장되었습니다");
      onSaved?.();
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "저장 실패");
    },
  });

  const handleSave = (values: CampaignFormValues) => {
    // image_url 이 채워진 언어만 오버라이드로 보낸다 — 서버는 image 없는
    // 항목을 400 으로 거부한다 (landing 만 채운 경우는 폼 validation 이 선차단).
    const localizations: MarketingCampaign["localizations"] = {};
    for (const { code } of OVERRIDE_LOCALES) {
      const entry = values.localizations?.[code];
      if (entry?.image_url) {
        localizations[code] = {
          image_url: entry.image_url,
          landing_url: entry.landing_url || null,
        };
      }
    }

    upsertMutation.mutate({
      id: campaign?.id ?? values.id!.trim(),
      body: {
        enabled: values.enabled,
        image_url: values.image_url || null,
        landing_url: values.landing_url || null,
        localizations,
        min_app_version: values.min_app_version || null,
        max_app_version: values.max_app_version || null,
        ends_at: values.ends_at ? values.ends_at.format() : null,
      },
    });
  };

  const requiredWhenEnabled = {
    validator: (_: unknown, value: string | null) =>
      form.getFieldValue("enabled") && !value
        ? Promise.reject(new Error("노출 상태에서는 필수입니다"))
        : Promise.resolve(),
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSave}
      initialValues={
        campaign
          ? {
              ...campaign,
              localizations: campaign.localizations ?? {},
              ends_at: campaign.ends_at ? dayjs(campaign.ends_at) : null,
            }
          : { enabled: false, localizations: {}, ends_at: null }
      }
    >
      {!campaign && (
        <Form.Item
          name="id"
          label="캠페인 ID"
          extra="클라이언트가 노출/닫음 이력을 구분하는 식별자. 언어와 무관하게 하나이며, 새 캠페인마다 바꿔주세요 (예: 2026-08-event). 저장 후에는 수정할 수 없습니다."
          rules={[{ required: true, whitespace: true, message: "필수입니다" }]}
        >
          <Input placeholder="2026-08-event" />
        </Form.Item>
      )}
      <Form.Item
        name="enabled"
        label="노출"
        valuePropName="checked"
        extra="켜면 앱 실행 시 /awake 응답으로 내려갑니다. 여러 캠페인이 켜져 있으면 이 페이지의 순서(우선순위)대로 함께 내려갑니다."
      >
        <Switch />
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
        <LocalizationFields key={code} form={form} code={code} label={label} />
      ))}
      <Typography.Title level={5} style={{ marginTop: 24 }}>
        노출 조건 (옵셔널)
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        비워두면 제한 없이 노출됩니다. 조건은 캠페인별로 서버가 앱 실행
        시점에 평가합니다 — 버전 조건이 걸려 있으면 버전을 보내지 않는 옛
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
          loading={upsertMutation.isPending}
        >
          저장
        </Button>
      </Space>
    </Form>
  );
}

export default function MarketingInAppPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["marketing-in-app"],
    queryFn: getMarketingCampaigns,
  });
  const campaigns = data?.campaigns ?? [];

  const moveMutation = useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) =>
      upsertMarketingCampaign(id, { position }),
    onSuccess: (list) => {
      queryClient.setQueryData(["marketing-in-app"], list);
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "순서 변경 실패");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMarketingCampaign,
    onSuccess: (list) => {
      queryClient.setQueryData(["marketing-in-app"], list);
      message.success("삭제되었습니다");
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "삭제 실패");
    },
  });

  return (
    <>
      <Space
        style={{
          width: "100%",
          maxWidth: 640,
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          인앱 마케팅 메시지
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreating(true)}
          disabled={creating}
        >
          새 캠페인
        </Button>
      </Space>
      <Typography.Paragraph type="secondary" style={{ maxWidth: 640 }}>
        캠페인 순서가 곧 노출 우선순위입니다 — 켜진 캠페인들이 위에서부터
        순서대로 클라이언트에 내려갑니다.
      </Typography.Paragraph>

      {isLoading && <Card style={{ maxWidth: 640 }} loading />}

      {!isLoading && campaigns.length === 0 && !creating && (
        <Card style={{ maxWidth: 640 }}>
          <Empty description="등록된 캠페인이 없습니다" />
        </Card>
      )}

      {campaigns.map((campaign, index) => (
        <Card
          key={campaign.id}
          style={{ maxWidth: 640, marginBottom: 16 }}
          title={
            <Space>
              {campaign.id}
              {campaign.enabled ? (
                <Tag color="green">노출 중</Tag>
              ) : (
                <Tag>꺼짐</Tag>
              )}
            </Space>
          }
          extra={
            <Space>
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                title="우선순위 올리기"
                disabled={index === 0 || moveMutation.isPending}
                onClick={() =>
                  moveMutation.mutate({ id: campaign.id, position: index - 1 })
                }
              />
              <Button
                size="small"
                icon={<ArrowDownOutlined />}
                title="우선순위 내리기"
                disabled={
                  index === campaigns.length - 1 || moveMutation.isPending
                }
                onClick={() =>
                  moveMutation.mutate({ id: campaign.id, position: index + 1 })
                }
              />
              <Popconfirm
                title="캠페인을 삭제할까요?"
                description="저장된 설정이 즉시 사라지고 클라이언트에 더 이상 내려가지 않습니다."
                okText="삭제"
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteMutation.mutate(campaign.id)}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteMutation.isPending}
                />
              </Popconfirm>
            </Space>
          }
        >
          <CampaignEditor campaign={campaign} />
        </Card>
      ))}

      {creating && (
        <Card
          style={{ maxWidth: 640, marginBottom: 16 }}
          title="새 캠페인"
          extra={
            <Button size="small" onClick={() => setCreating(false)}>
              취소
            </Button>
          }
        >
          <CampaignEditor campaign={null} onSaved={() => setCreating(false)} />
        </Card>
      )}
    </>
  );
}

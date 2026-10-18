import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";
import {
  PAYWALL_BADGE_OPTIONS,
  type PaywallCampaign,
  getPaywallCampaigns,
  upsertPaywallCampaign,
} from "../../api/appSettings";

// Form 에서는 기간을 DatePicker 값(Dayjs)으로 다루고 저장 시 offset 포함
// ISO 8601 로 보낸다. offset 은 이 브라우저의 시간대 — 서울에서 쓰면 +09:00 이며
// 한국·일본 스토어 모두 같은 시간대라 그대로 쓴다. 저장되는 값은 피커 아래에 표시한다.
type CampaignFormValues = Omit<
  PaywallCampaign,
  "id" | "starts_at" | "ends_at" | "storefronts"
> & {
  id?: string;
  starts_at: Dayjs | null;
  ends_at: Dayjs | null;
  storefronts: string[];
};

// 자주 쓰는 스토어프론트 — 자유 입력도 허용한다(ISO 3166-1 alpha-3 대문자).
const STOREFRONT_PRESETS = [
  { value: "KOR", label: "KOR (한국)" },
  { value: "JPN", label: "JPN (일본)" },
  { value: "USA", label: "USA (미국)" },
  { value: "TWN", label: "TWN (대만)" },
  { value: "HKG", label: "HKG (홍콩)" },
];

function errorDetail(err: unknown) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data
    ?.detail;
}

function StoredIsoHint({ value }: { value?: Dayjs | null }) {
  return value ? (
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      저장값: <Typography.Text code>{value.format()}</Typography.Text>
    </Typography.Text>
  ) : null;
}

function CampaignForm({
  campaign,
  onCreated,
}: {
  /** null 이면 신규 작성 폼 — 캠페인 ID 필드를 입력받는다. */
  campaign: PaywallCampaign | null;
  onCreated?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CampaignFormValues>();
  const startsAt = Form.useWatch("starts_at", form);
  const endsAt = Form.useWatch("ends_at", form);

  const upsertMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof upsertPaywallCampaign>[1];
    }) => upsertPaywallCampaign(id, body),
    onSuccess: (list, { id }) => {
      queryClient.setQueryData(["paywall-campaigns"], list);
      message.success("저장되었습니다");
      if (!campaign) onCreated?.(id);
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "저장 실패");
    },
  });

  const handleSave = (values: CampaignFormValues) => {
    upsertMutation.mutate({
      id: campaign?.id ?? values.id!.trim(),
      body: {
        enabled: values.enabled,
        name: values.name?.trim() || null,
        yearly_product_id: values.yearly_product_id?.trim() || null,
        badge: values.badge ?? null,
        starts_at: values.starts_at ? values.starts_at.format() : null,
        ends_at: values.ends_at ? values.ends_at.format() : null,
        storefronts: values.storefronts?.length ? values.storefronts : null,
        min_app_version: values.min_app_version || null,
        max_app_version: values.max_app_version || null,
      },
    });
  };

  const requiredWhenEnabled = {
    validator: (_: unknown, value: unknown) =>
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
              storefronts: campaign.storefronts ?? [],
              starts_at: campaign.starts_at ? dayjs(campaign.starts_at) : null,
              ends_at: campaign.ends_at ? dayjs(campaign.ends_at) : null,
            }
          : {
              enabled: false,
              storefronts: [],
              starts_at: null,
              ends_at: null,
            }
      }
    >
      {!campaign && (
        <Form.Item
          name="id"
          label="캠페인 ID"
          extra="분석 이벤트에 그대로 실리는 식별자 (예: earlybird-2026). 저장 후에는 수정할 수 없습니다."
          rules={[{ required: true, whitespace: true, message: "필수입니다" }]}
        >
          <Input placeholder="earlybird-2026" />
        </Form.Item>
      )}
      <Form.Item name="name" label="이름 (어드민 메모)">
        <Input placeholder="얼리버드 (출시 ~ 11/30, 한국·일본)" />
      </Form.Item>
      <Form.Item
        name="enabled"
        label="노출"
        valuePropName="checked"
        extra="켜면 기간 안에서 앱 실행 시 /awake 로 내려갑니다. 상품이 App Store Connect 에 아직 없거나 그 스토어에서 팔지 않으면 앱은 정가 연간으로 조용히 폴백합니다."
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="yearly_product_id"
        label="연간 상품 ID"
        extra="App Store Connect 의 할인 연간 상품 id. 월간은 캠페인 대상이 아닙니다."
        rules={[
          requiredWhenEnabled,
          {
            pattern: /^[A-Za-z0-9][A-Za-z0-9._]{0,99}$/,
            message: "영숫자·점·밑줄만 쓸 수 있습니다",
          },
        ]}
      >
        <Input placeholder="myday_plus_yearly_earlybird" />
      </Form.Item>
      <Form.Item
        name="badge"
        label="배지"
        extra="플랜 카드 위 배지 종류. 문구·할인율(월간×12 대비)·색은 앱이 가격으로 계산해 그립니다."
        rules={[requiredWhenEnabled]}
      >
        <Select
          allowClear
          options={PAYWALL_BADGE_OPTIONS}
          placeholder="선택"
          style={{ width: 200 }}
        />
      </Form.Item>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        노출 범위
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        기간은 서버가 앱 실행 시점에 판정하고, 스토어는 앱이 자기 App Store
        스토어프론트와 맞춰 봅니다. 기간을 비우면 그쪽 경계가 없고, 스토어를
        비우면 전체 스토어입니다. 단 App Store Connect 의 상품 국가 가용성이 상위
        제약이라 거기서 팔지 않는 나라에는 어차피 보이지 않습니다.
      </Typography.Paragraph>
      <Space size="large" align="start" wrap>
        <Form.Item name="starts_at" label="시작 일시">
          <DatePicker showTime format="YYYY-MM-DD HH:mm" />
        </Form.Item>
        <Form.Item
          name="ends_at"
          label="종료 일시"
          dependencies={["starts_at"]}
          extra='앱의 "~11/30까지" 표기에 쓰입니다. 23:59 로 두면 그날까지 노출됩니다.'
          rules={[
            {
              validator: (_: unknown, value: Dayjs | null) => {
                const start = form.getFieldValue("starts_at") as Dayjs | null;
                return value && start && !start.isBefore(value)
                  ? Promise.reject(new Error("종료가 시작보다 뒤여야 합니다"))
                  : Promise.resolve();
              },
            },
          ]}
        >
          <DatePicker showTime format="YYYY-MM-DD HH:mm" />
        </Form.Item>
      </Space>
      <Space direction="vertical" size={0} style={{ marginBottom: 16 }}>
        <StoredIsoHint value={startsAt} />
        <StoredIsoHint value={endsAt} />
      </Space>
      <Form.Item
        name="storefronts"
        label="스토어 (ISO 3166-1 alpha-3)"
        extra="비우면 전체 스토어. 목록에 없는 나라는 코드 세 글자를 직접 입력해 추가합니다."
        rules={[
          {
            validator: (_: unknown, value: string[]) =>
              value?.some((code) => !/^[A-Z]{3}$/.test(code))
                ? Promise.reject(new Error("대문자 세 글자 코드만 쓸 수 있습니다 (예: KOR)"))
                : Promise.resolve(),
          },
        ]}
      >
        <Select
          mode="tags"
          options={STOREFRONT_PRESETS}
          placeholder="전체 스토어"
          tokenSeparators={[",", " "]}
          onChange={(value: string[]) =>
            form.setFieldValue(
              "storefronts",
              value.map((v) => v.trim().toUpperCase()),
            )
          }
        />
      </Form.Item>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        앱 버전 조건 (옵셔널)
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        페이월 캠페인을 모르는 옛 앱은 어차피 무시하므로 보통 비워둡니다. 특정
        버전에서만 보여야 할 때 씁니다.
      </Typography.Paragraph>
      <Space size="large" align="start">
        <Form.Item
          name="min_app_version"
          label="최소 앱 버전 (이상)"
          rules={[{ pattern: /^\d+(\.\d+)*$/, message: "1.2.3 형태로 입력하세요" }]}
        >
          <Input placeholder="3.0.0" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item
          name="max_app_version"
          label="최대 앱 버전 (이하)"
          rules={[{ pattern: /^\d+(\.\d+)*$/, message: "1.2.3 형태로 입력하세요" }]}
        >
          <Input placeholder="3.9.9" style={{ width: 160 }} />
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

export default function PaywallCampaignEditorPage() {
  // /paywall/new 라우트에는 param 이 없다 — campaignId 없음 = 신규 작성.
  const { campaignId } = useParams<{ campaignId: string }>();
  const isNew = campaignId === undefined;
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["paywall-campaigns"],
    queryFn: getPaywallCampaigns,
  });
  const campaign = isNew
    ? null
    : (data?.campaigns ?? []).find((c) => c.id === campaignId) ?? null;

  return (
    <div style={{ maxWidth: 640 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/paywall")} />
        <Typography.Title level={4} style={{ margin: 0 }}>
          {isNew ? "새 캠페인" : campaign?.name || campaignId}
        </Typography.Title>
        {campaign &&
          (campaign.enabled ? <Tag color="green">켜짐</Tag> : <Tag>꺼짐</Tag>)}
      </Space>

      {!isNew && isLoading && <Card loading />}

      {!isNew && !isLoading && !campaign && (
        <Alert
          type="warning"
          showIcon
          message="캠페인을 찾을 수 없습니다"
          description="삭제되었거나 잘못된 주소입니다. 목록에서 다시 선택해주세요."
        />
      )}

      {(isNew || campaign) && (
        <Card>
          <CampaignForm
            key={campaign?.id ?? "new"}
            campaign={campaign}
            onCreated={(id) =>
              navigate(`/paywall/${encodeURIComponent(id)}`, { replace: true })
            }
          />
        </Card>
      )}
    </div>
  );
}

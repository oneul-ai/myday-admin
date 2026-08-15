import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, MailOutlined, SendOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  createEmailCampaign,
  getEmailCampaign,
  sendEmailCampaign,
  sendTestEmail,
  updateEmailCampaign,
  type EmailCampaign,
  type EmailCampaignInput,
  type PostmarkBulkStatus,
} from "../../api/emailCampaigns";

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: "draft", color: "gold" },
  sending: { label: "sending", color: "blue" },
  sent: { label: "sent", color: "green" },
  failed: { label: "failed", color: "red" },
};

function errorDetail(err: unknown): string | undefined {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
}

// 템플릿 변수는 JSON textarea 로 편집한다. name 은 발송 시 수신자별로 주입되는
// 예약 변수라 서버에서도 거부하므로 프론트에서 먼저 막는다.
function parseTemplateModel(raw: string): Record<string, string> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("템플릿 변수가 올바른 JSON이 아닙니다.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("템플릿 변수는 JSON 객체여야 합니다.");
  }
  if ("name" in parsed) {
    throw new Error("name 은 수신자별로 자동 주입되므로 템플릿 변수에 넣을 수 없습니다.");
  }
  return parsed as Record<string, string>;
}

export default function EmailCampaignEditorPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = id ? Number(id) : null;
  const isNew = campaignId === null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();
  const [sending, setSending] = useState(false);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["email-campaign", campaignId],
    queryFn: () => getEmailCampaign(campaignId!),
    enabled: !isNew,
    // 발송 중이면 Postmark 진행률을 폴링한다 (서버가 완료 시 sent 로 전이).
    refetchInterval: (query) => (query.state.data?.status === "sending" ? 5000 : false),
  });

  const isDraft = isNew || campaign?.status === "draft";
  const preview = campaign?.audience_preview;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const values = await form.validateFields();
      const body: EmailCampaignInput = {
        template_alias: values.template_alias,
        noname_template_alias: values.noname_template_alias?.trim() ? values.noname_template_alias.trim() : null,
        template_model: parseTemplateModel(values.template_model ?? ""),
        marketing_agreed_only: values.marketing_agreed_only,
      };
      return isNew ? createEmailCampaign(body) : updateEmailCampaign(campaignId!, body);
    },
    onSuccess: (saved: EmailCampaign) => {
      message.success("저장되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      queryClient.setQueryData(["email-campaign", saved.id], saved);
      if (isNew) navigate(`/email-campaigns/${saved.id}`, { replace: true });
    },
    onError: (err: unknown) => {
      if ((err as { errorFields?: unknown }).errorFields) return;
      if (err instanceof Error && !("response" in err)) {
        message.error(err.message);
        return;
      }
      message.error(errorDetail(err) ?? "저장 실패");
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => sendEmailCampaign(campaignId!),
    onMutate: () => setSending(true),
    onSettled: () => setSending(false),
    onSuccess: (sent: EmailCampaign) => {
      message.success(`발송이 접수되었습니다 (${sent.recipient_count}명).`);
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      queryClient.setQueryData(["email-campaign", sent.id], sent);
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "발송 실패");
      // 실패 시 상태(failed/부분 발송 기록)를 다시 읽는다.
      queryClient.invalidateQueries({ queryKey: ["email-campaign", campaignId] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const values = await testForm.validateFields();
      return sendTestEmail(campaignId!, {
        to: values.to,
        variant: values.variant,
        name: values.name || undefined,
      });
    },
    onSuccess: (res) => {
      message.success(`테스트 발송 완료 → ${res.to} (${res.template_alias})`);
    },
    onError: (err: unknown) => {
      if ((err as { errorFields?: unknown }).errorFields) return;
      message.error(errorDetail(err) ?? "테스트 발송 실패");
    },
  });

  if (!isNew && isLoading) return <Card loading />;
  if (!isNew && !campaign) return <Alert type="error" message="캠페인을 찾을 수 없습니다." />;

  const statusMeta = campaign ? (STATUS_META[campaign.status] ?? { label: campaign.status, color: "default" }) : null;

  const bulkColumns = [
    {
      title: "템플릿",
      dataIndex: "template_alias",
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    { title: "Bulk ID", dataIndex: "bulk_id", width: 140 },
    { title: "수신자", dataIndex: "count", width: 90 },
    {
      title: "진행률",
      key: "progress",
      render: (_: unknown, row: PostmarkBulkStatus) =>
        row.percentage_completed != null ? (
          <Progress percent={Math.round(row.percentage_completed)} size="small" style={{ maxWidth: 200 }} />
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "상태",
      dataIndex: "status",
      width: 120,
      render: (v: string | undefined) => (v ? <Tag>{v}</Tag> : <Typography.Text type="secondary">—</Typography.Text>),
    },
  ];

  return (
    <div style={{ maxWidth: 960 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/email-campaigns")}>
          목록
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {isNew ? "새 이메일 캠페인" : `캠페인 #${campaign!.id}`}
        </Typography.Title>
        {statusMeta && <Tag color={statusMeta.color}>{statusMeta.label}</Tag>}
      </Space>

      {campaign?.error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="발송 실패"
          description={
            <>
              {campaign.error}
              {campaign.postmark_bulk_ids?.length ? (
                <div style={{ marginTop: 8 }}>
                  아래 접수된 청크는 이미 발송이 진행되었습니다 — 같은 대상에게 재발송하지 않도록 주의하세요.
                </div>
              ) : null}
            </>
          }
        />
      )}

      <Card title="캠페인 설정" style={{ marginBottom: 16 }}>
        <Form
          key={campaign ? `c-${campaign.id}-${campaign.status}` : "new"}
          form={form}
          layout="vertical"
          disabled={!isDraft}
          initialValues={{
            template_alias: campaign?.template_alias ?? "",
            noname_template_alias: campaign?.noname_template_alias ?? "",
            template_model: campaign ? JSON.stringify(campaign.template_model, null, 2) : "{\n  \n}",
            marketing_agreed_only: campaign?.marketing_agreed_only ?? true,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="template_alias"
                label="Postmark 템플릿 alias"
                rules={[{ required: true, whitespace: true, message: "템플릿 alias를 입력하세요." }]}
              >
                <Input placeholder="v2-update" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="noname_template_alias"
                label="이름 없는 유저용 alias"
                tooltip="이름이 비어있는 유저에게 보낼 템플릿. 비워두면 해당 유저는 발송에서 제외됩니다."
              >
                <Input placeholder="v2-update-noname" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="template_model"
            label="공통 템플릿 변수 (JSON)"
            tooltip="name 은 수신자별로 자동 주입되므로 넣지 않습니다."
            rules={[
              {
                validator: async (_, value: string) => {
                  parseTemplateModel(value ?? "");
                },
              },
            ]}
          >
            <Input.TextArea
              rows={6}
              style={{ fontFamily: "monospace" }}
              placeholder={'{\n  "preheader": "마이데이가 새로워졌어요!",\n  "app_link": "https://apps.apple.com/..."\n}'}
            />
          </Form.Item>
          <Form.Item
            name="marketing_agreed_only"
            label="마케팅 수신동의 유저만"
            valuePropName="checked"
            tooltip="광고성 메일은 반드시 켠 상태로 발송해야 합니다. 서비스 중요 공지만 전체 발송이 가능합니다."
          >
            <Switch />
          </Form.Item>
          {isDraft && (
            <Button type="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              저장
            </Button>
          )}
        </Form>
      </Card>

      {isDraft && !isNew && (
        <>
          <Card title="발송 대상" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="총 수신자" value={preview?.total ?? 0} />
              </Col>
              <Col span={8}>
                <Statistic title="이름 있음" value={preview?.named ?? 0} />
              </Col>
              <Col span={8}>
                <Statistic title="이름 없음" value={preview?.noname ?? 0} />
              </Col>
            </Row>
            {preview?.noname_will_be_skipped && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
                message={`이름 없는 유저 ${preview.noname}명은 noname 템플릿이 없어 발송에서 제외됩니다.`}
              />
            )}
            <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
              탈퇴·게스트 계정은 항상 제외되며, 동일 이메일 복수 계정은 1통만 발송됩니다. 저장된 필터
              기준의 미리보기이므로 필터를 바꿨다면 먼저 저장하세요.
            </Typography.Paragraph>
          </Card>

          <Card title="테스트 발송" style={{ marginBottom: 16 }}>
            <Form form={testForm} layout="inline" initialValues={{ variant: "named", name: "" }}>
              <Form.Item
                name="to"
                rules={[{ required: true, type: "email", message: "이메일 주소를 입력하세요." }]}
              >
                <Input placeholder="받을 주소" style={{ width: 240 }} />
              </Form.Item>
              <Form.Item name="variant">
                <Select
                  style={{ width: 150 }}
                  options={[
                    { value: "named", label: "이름 있음" },
                    { value: "noname", label: "이름 없음" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="name">
                <Input placeholder="테스트용 이름 (선택)" style={{ width: 180 }} />
              </Form.Item>
              <Button icon={<MailOutlined />} loading={testMutation.isPending} onClick={() => testMutation.mutate()}>
                테스트 발송
              </Button>
            </Form>
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              저장된 캠페인 설정 기준으로 발송됩니다. 수정했다면 먼저 저장하세요.
            </Typography.Paragraph>
          </Card>

          <Card title="실발송">
            <Popconfirm
              title="정말 발송할까요?"
              description={`${preview?.total ?? 0}명에게 즉시 발송됩니다. 되돌릴 수 없습니다.`}
              okText="발송"
              okButtonProps={{ danger: true }}
              onConfirm={() => sendMutation.mutate()}
            >
              <Button type="primary" danger icon={<SendOutlined />} loading={sending} disabled={!preview?.total}>
                {preview?.total ?? 0}명에게 발송
              </Button>
            </Popconfirm>
          </Card>
        </>
      )}

      {!isDraft && campaign && (
        <Card title="발송 현황">
          <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="수신자 수">{campaign.recipient_count ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="발송 접수">
              {campaign.sent_at ? dayjs(campaign.sent_at).format("YYYY-MM-DD HH:mm") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="생성자">{campaign.created_by}</Descriptions.Item>
            <Descriptions.Item label="대상 필터">
              {campaign.marketing_agreed_only ? "마케팅 동의 유저" : "전체 유저"}
            </Descriptions.Item>
          </Descriptions>
          {campaign.status === "sending" && campaign.progress != null && (
            <Progress percent={Math.round(campaign.progress)} style={{ marginBottom: 16 }} />
          )}
          {campaign.postmark_error && (
            <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="진행률 조회 실패" description={campaign.postmark_error} />
          )}
          <Table<PostmarkBulkStatus>
            rowKey={(r) => String(r.bulk_id)}
            size="small"
            columns={bulkColumns}
            dataSource={campaign.postmark_statuses ?? (campaign.postmark_bulk_ids as PostmarkBulkStatus[] | null) ?? []}
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
}

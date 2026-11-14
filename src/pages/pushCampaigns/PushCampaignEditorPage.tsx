import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  TranslationOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";
import {
  cancelPushCampaign,
  createPushCampaign,
  getPushCampaign,
  schedulePushCampaign,
  sendPushCampaign,
  sendPushCampaignTest,
  translatePushCopy,
  updatePushCampaign,
  PUSH_LOCALES,
  PUSH_PLATFORMS,
  PUSH_PLATFORM_LABELS,
  type ConsentRequirement,
  type PushCampaign,
  type PushCampaignInput,
  type PushLocale,
  type PushLocalizations,
  type PushPlatform,
  type ScheduleBasis,
} from "../../api/pushCampaigns";
import { LOCALE_LABELS, OVERRIDE_LOCALES } from "../../constants/locales";
import ScheduleText from "./ScheduleText";
import { CONSENT_OPTIONS, KST, STATUS_META, errorDetail } from "./shared";

const TITLE_MAX = 100;
const BODY_MAX = 500;

interface FormValues {
  name: string;
  localizations: Record<PushLocale, { title?: string; body?: string } | undefined>;
  deeplink?: string;
  consent_requirements: ConsentRequirement[];
  platforms: PushPlatform[];
  min_app_versions: Partial<Record<PushPlatform, string>>;
  include_unknown_app_version: boolean;
  schedule_basis: ScheduleBasis;
  // absolute: KST 벽시계로 다루는 발송 시각. local: 유저 현지 벽시계 시각.
  scheduled_time: Dayjs | null;
}

/** DatePicker 값(벽시계)을 서버 포맷으로 — absolute 는 KST 로 해석한 ISO, local 은 벽시계 그대로. */
function toScheduleInput(basis: ScheduleBasis, v: Dayjs | null) {
  const wall = v ? v.format("YYYY-MM-DDTHH:mm") : null;
  return basis === "local"
    ? { scheduled_local_time: wall }
    : { scheduled_at: wall ? dayjs.tz(wall, KST).toISOString() : null };
}

/** 서버 값을 DatePicker 값(벽시계)으로 — absolute 는 KST 벽시계를 로컬 Dayjs 로 옮긴다. */
function fromCampaign(campaign: PushCampaign | undefined): Dayjs | null {
  if (!campaign) return null;
  if (campaign.schedule_basis === "local") {
    return campaign.scheduled_local_time ? dayjs(campaign.scheduled_local_time) : null;
  }
  return campaign.scheduled_at
    ? dayjs(dayjs(campaign.scheduled_at).tz(KST).format("YYYY-MM-DDTHH:mm"))
    : null;
}

function toInput(values: FormValues): PushCampaignInput {
  const localizations: PushLocalizations = {};
  for (const locale of PUSH_LOCALES) {
    const title = values.localizations?.[locale]?.title?.trim() ?? "";
    const body = values.localizations?.[locale]?.body?.trim() ?? "";
    // 비워 둔 언어는 보내지 않는다 (발송 시 en → ko 폴백).
    if (title || body) localizations[locale] = { title, body };
  }
  return {
    name: values.name,
    localizations,
    deeplink: values.deeplink?.trim() || null,
    consent_requirements: values.consent_requirements ?? [],
    platforms: values.platforms,
    // 대상에서 뺀 플랫폼과 비워 둔 입력은 보내지 않는다 (= 버전 제한 없음).
    min_app_versions: Object.fromEntries(
      PUSH_PLATFORMS.filter((p) => values.platforms.includes(p))
        .map((p) => [p, values.min_app_versions?.[p]?.trim() ?? ""] as const)
        .filter(([, v]) => v),
    ),
    include_unknown_app_version: values.include_unknown_app_version ?? false,
    schedule_basis: values.schedule_basis,
    ...toScheduleInput(values.schedule_basis, values.scheduled_time),
  };
}

export default function PushCampaignEditorPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = id ? Number(id) : null;
  const isNew = campaignId === null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [testForm] = Form.useForm<{ uid: string; locale?: PushLocale }>();

  const { data: campaign, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["push-campaign", campaignId],
    queryFn: () => getPushCampaign(campaignId!),
    enabled: !isNew,
    // 예약·발송 중이면 디스패처가 상태를 바꾸므로 폴링한다.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "scheduled" || status === "sending" ? 10000 : false;
    },
  });

  const isDraft = isNew || campaign?.status === "draft";
  const preview = campaign?.audience_preview;
  const basis = Form.useWatch("schedule_basis", form) ?? campaign?.schedule_basis ?? "absolute";
  const consent = Form.useWatch("consent_requirements", form);
  const platforms = Form.useWatch("platforms", form) ?? campaign?.platforms ?? PUSH_PLATFORMS;
  const minVersions = Form.useWatch("min_app_versions", form);
  const hasMinVersion = platforms.some((p) => minVersions?.[p]?.trim());

  const applySaved = (saved: PushCampaign) => {
    queryClient.invalidateQueries({ queryKey: ["push-campaigns"] });
    queryClient.setQueryData(["push-campaign", saved.id], saved);
  };

  // 폼을 검증해 저장한다. 예약·발송·테스트도 이걸 먼저 불러 화면의 내용이 그대로 나가게 한다.
  const saveDraft = async () => {
    const values = await form.validateFields();
    const body = toInput(values);
    const saved = isNew
      ? await createPushCampaign(body)
      : await updatePushCampaign(campaignId!, body);
    applySaved(saved);
    return saved;
  };

  const onError = (fallback: string) => (err: unknown) => {
    if ((err as { errorFields?: unknown }).errorFields) return; // 폼 검증 실패는 필드에 표시된다
    message.error(errorDetail(err) ?? fallback);
    if (!isNew) queryClient.invalidateQueries({ queryKey: ["push-campaign", campaignId] });
  };

  const saveMutation = useMutation({
    mutationFn: saveDraft,
    onSuccess: (saved) => {
      message.success("저장되었습니다.");
      if (isNew) navigate(`/push-campaigns/${saved.id}`, { replace: true });
    },
    onError: onError("저장 실패"),
  });

  const translateMutation = useMutation({
    mutationFn: async () => {
      const { localizations } = await form.validateFields([
        ["localizations", "ko", "title"],
        ["localizations", "ko", "body"],
      ]);
      return translatePushCopy({
        title: localizations.ko!.title!,
        body: localizations.ko!.body!,
      });
    },
    onSuccess: (translated) => {
      form.setFieldsValue({ localizations: translated } as Partial<FormValues>);
      message.success("번역 초안을 채웠습니다. 검토 후 저장하세요.");
    },
    onError: onError("번역 실패"),
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => schedulePushCampaign((await saveDraft()).id),
    onSuccess: (saved) => {
      applySaved(saved);
      message.success("예약되었습니다.");
      if (isNew) navigate(`/push-campaigns/${saved.id}`, { replace: true });
    },
    onError: onError("예약 실패"),
  });

  const sendMutation = useMutation({
    mutationFn: async () =>
      sendPushCampaign(campaign?.status === "scheduled" ? campaignId! : (await saveDraft()).id),
    onSuccess: (sent) => {
      applySaved(sent);
      message.success(`발송되었습니다 (유저 ${sent.recipient_count}명 · 기기 ${sent.device_count}대).`);
      if (isNew) navigate(`/push-campaigns/${sent.id}`, { replace: true });
    },
    onError: onError("발송 실패"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelPushCampaign(campaignId!),
    onSuccess: (saved) => {
      applySaved(saved);
      message.success(saved.status === "draft" ? "예약을 취소했습니다." : "남은 발송을 중단했습니다.");
    },
    onError: onError("취소 실패"),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const values = await testForm.validateFields();
      const target = isDraft ? (await saveDraft()).id : campaignId!;
      return sendPushCampaignTest(target, { uid: values.uid.trim(), locale: values.locale });
    },
    onSuccess: (res) => message.success(`테스트 발송 완료 (기기 ${res.devices}대)`),
    onError: onError("테스트 발송 실패"),
  });

  if (!isNew && isLoading) return <Card loading />;
  if (!isNew && !campaign) return <Alert type="error" message="캠페인을 찾을 수 없습니다." />;

  const statusMeta = campaign
    ? (STATUS_META[campaign.status] ?? { label: campaign.status, color: "default" })
    : null;
  const busy =
    saveMutation.isPending ||
    scheduleMutation.isPending ||
    sendMutation.isPending ||
    cancelMutation.isPending;

  const copyFields = (locale: PushLocale, required: boolean) => (
    <>
      <Form.Item
        name={["localizations", locale, "title"]}
        label="제목"
        rules={required ? [{ required: true, whitespace: true, message: "제목을 입력하세요." }] : []}
      >
        <Input maxLength={TITLE_MAX} showCount />
      </Form.Item>
      <Form.Item
        name={["localizations", locale, "body"]}
        label="본문"
        rules={required ? [{ required: true, whitespace: true, message: "본문을 입력하세요." }] : []}
      >
        <Input.TextArea maxLength={BODY_MAX} showCount autoSize={{ minRows: 2, maxRows: 6 }} />
      </Form.Item>
    </>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/push-campaigns")}>
          목록
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {isNew ? "새 푸시 캠페인" : `푸시 캠페인 #${campaign!.id}`}
        </Typography.Title>
        {statusMeta && <Tag color={statusMeta.color}>{statusMeta.label}</Tag>}
        <Tag>type=marketing</Tag>
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
              {campaign.device_count > 0 && (
                <div style={{ marginTop: 8 }}>
                  기기 {campaign.device_count}대에는 이미 발송되었습니다 — 같은 대상에게 다시 보내지 않도록
                  주의하세요.
                </div>
              )}
            </>
          }
        />
      )}

      {campaign?.status === "scheduled" && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <>
              <ScheduleText campaign={campaign} /> 발송 예약됨
            </>
          }
          description="내용을 고치려면 예약을 취소하세요. 예약 시각을 30분 넘게 놓친 발송은 보내지 않습니다."
        />
      )}

      <Form
        key={campaign ? `c-${campaign.id}-${campaign.status}` : "new"}
        form={form}
        layout="vertical"
        disabled={!isDraft}
        initialValues={{
          name: campaign?.name ?? "",
          localizations: campaign?.localizations ?? {},
          deeplink: campaign?.deeplink ?? "",
          consent_requirements: campaign?.consent_requirements ?? ["marketing_agreed"],
          platforms: campaign?.platforms ?? PUSH_PLATFORMS,
          min_app_versions: campaign?.min_app_versions ?? {},
          include_unknown_app_version: campaign?.include_unknown_app_version ?? false,
          schedule_basis: campaign?.schedule_basis ?? "absolute",
          scheduled_time: fromCampaign(campaign),
        }}
      >
        <Card title="문구" style={{ marginBottom: 16 }}>
          <Form.Item
            name="name"
            label="캠페인 이름"
            tooltip="어드민 목록용 이름입니다. 유저에게 노출되지 않습니다."
            rules={[{ required: true, whitespace: true, message: "캠페인 이름을 입력하세요." }]}
          >
            <Input maxLength={100} placeholder="11월 새 기능 소식" />
          </Form.Item>

          <Typography.Title level={5}>한국어 (ko, 원문)</Typography.Title>
          {copyFields("ko", true)}

          <Space style={{ marginBottom: 16 }} wrap>
            <Popconfirm
              title="한국어 원문을 AI 로 번역할까요?"
              description="아래 4개 언어의 입력 내용을 번역 결과로 덮어씁니다."
              onConfirm={() => translateMutation.mutate()}
              disabled={!isDraft}
            >
              <Button icon={<TranslationOutlined />} loading={translateMutation.isPending}>
                AI 번역으로 채우기
              </Button>
            </Popconfirm>
            <Typography.Text type="secondary">
              번역은 초안입니다 — 검토·수정 후 저장하세요. 비워 둔 언어의 유저는 영어 → 한국어 순으로
              받습니다.
            </Typography.Text>
          </Space>

          <Row gutter={16}>
            {OVERRIDE_LOCALES.map(({ code, label }) => (
              <Col span={12} key={code}>
                <Typography.Title level={5}>{label}</Typography.Title>
                {copyFields(code, false)}
              </Col>
            ))}
          </Row>

          <Form.Item
            name="deeplink"
            label="딥링크"
            tooltip="알림을 탭하면 이동할 화면. 비우면 앱만 엽니다."
            style={{ marginBottom: 0 }}
          >
            <Input maxLength={500} placeholder="myday://my-page" />
          </Form.Item>
        </Card>

        <Card title="수신 동의 기준" style={{ marginBottom: 16 }}>
          <Form.Item
            name="consent_requirements"
            extra="선택한 기준을 모두 만족한 유저에게만 보냅니다. 탈퇴 유저와 푸시 토큰이 없는 기기는 항상 제외됩니다."
            style={{ marginBottom: 0 }}
          >
            <Checkbox.Group>
              <Space direction="vertical">
                {CONSENT_OPTIONS.map((o) => (
                  <Checkbox key={o.value} value={o.value}>
                    {o.label} <Typography.Text type="secondary">— {o.hint}</Typography.Text>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>
          {consent?.length === 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message="수신 동의와 무관하게 전체 유저에게 발송됩니다. 서비스 공지에만 사용하세요."
            />
          )}
        </Card>

        <Card title="앱 플랫폼 · 버전" style={{ marginBottom: 16 }}>
          <Form.Item
            name="platforms"
            label="대상 플랫폼"
            rules={[{ required: true, type: "array", min: 1, message: "플랫폼을 하나 이상 선택하세요." }]}
          >
            <Checkbox.Group
              options={PUSH_PLATFORMS.map((p) => ({ value: p, label: PUSH_PLATFORM_LABELS[p] }))}
            />
          </Form.Item>
          <Row gutter={16}>
            {PUSH_PLATFORMS.map((p) => (
              <Col span={12} key={p}>
                <Form.Item
                  name={["min_app_versions", p]}
                  label={`${PUSH_PLATFORM_LABELS[p]} 최소 앱 버전`}
                  tooltip="이 버전 이상을 쓰는 기기에만 보냅니다. 비우면 버전 제한이 없습니다."
                  rules={[
                    {
                      pattern: /^\s*\d+(\.\d+)*\s*$/,
                      message: "3.1.0 처럼 숫자와 점으로 입력하세요.",
                    },
                  ]}
                >
                  <Input
                    placeholder="제한 없음"
                    disabled={!isDraft || !platforms.includes(p)}
                    addonAfter="이상"
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <Form.Item
            name="include_unknown_app_version"
            valuePropName="checked"
            extra="버전은 기기가 마지막으로 앱을 연 시점 기준입니다. 버전 기록 도입 이후 앱을 한 번도 열지 않은 기기는 '미확인'이며, 기본적으로 버전 제한이 걸린 플랫폼에서는 제외됩니다."
            style={{ marginBottom: 0 }}
          >
            <Checkbox disabled={!isDraft || !hasMinVersion}>
              버전 미확인 기기도 포함 (구버전 유저에게 업데이트를 권할 때)
            </Checkbox>
          </Form.Item>
        </Card>

        <Card title="발송 시각" style={{ marginBottom: 16 }}>
          <Form.Item name="schedule_basis" label="발송 시각 기준">
            <Radio.Group
              options={[
                { value: "absolute", label: "한국 시각 (전원 동시 발송)" },
                { value: "local", label: "유저 현지 시각 (타임존별 순차 발송)" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="scheduled_time"
            label={basis === "local" ? "발송 시각 (유저 현지 시각)" : "발송 시각 (KST)"}
            extra={
              basis === "local"
                ? "각 유저의 현지 시각이 이 시각이 되면 발송됩니다. 타임존을 모르는 유저는 한국 시각으로 받고, 예약 시점에 이미 이 시각이 지난 타임존의 유저는 받지 못합니다."
                : "이 시각에 전체 대상에게 한 번에 발송됩니다. 해외 유저에게는 현지 야간일 수 있습니다."
            }
            style={{ marginBottom: 0 }}
          >
            <DatePicker showTime={{ format: "HH:mm" }} format="YYYY-MM-DD HH:mm" minuteStep={5} />
          </Form.Item>
        </Card>
      </Form>

      {preview && (
        <Card
          title="발송 대상 미리보기"
          style={{ marginBottom: 16 }}
          extra={
            <Button icon={<ReloadOutlined />} size="small" loading={isFetching} onClick={() => refetch()}>
              새로고침
            </Button>
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="유저" value={preview.users} />
            </Col>
            <Col span={6}>
              <Statistic title="기기" value={preview.devices} />
            </Col>
          </Row>
          {preview.excluded.platform + preview.excluded.app_version + preview.excluded.unknown_app_version >
            0 && (
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              플랫폼·버전 조건으로 제외: 대상 외 플랫폼 {preview.excluded.platform}대 · 최소 버전 미만{" "}
              {preview.excluded.app_version}대 · 버전 미확인 {preview.excluded.unknown_app_version}대
            </Typography.Paragraph>
          )}
          <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
            {PUSH_PLATFORMS.map((p) => (
              <Descriptions.Item key={p} label={`${PUSH_PLATFORM_LABELS[p]} 버전 분포 (필터 전 ${preview.by_platform[p]}대)`}>
                {preview.app_versions[p].length ? (
                  <Space size={[0, 4]} wrap>
                    {preview.app_versions[p].slice(0, 10).map(({ version, devices }) => (
                      <Tag key={version ?? "unknown"} color={version === null ? "orange" : undefined}>
                        {version ?? "미확인"} · {devices}
                      </Tag>
                    ))}
                    {preview.app_versions[p].length > 10 && (
                      <Typography.Text type="secondary">
                        외 {preview.app_versions[p].length - 10}개 버전
                      </Typography.Text>
                    )}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">기기 없음</Typography.Text>
                )}
              </Descriptions.Item>
            ))}
            <Descriptions.Item label="언어별 기기 (자동 배정)">
              <Space size={[0, 4]} wrap>
                {PUSH_LOCALES.map((locale) => (
                  <Tag key={locale} color={preview.fallback_locales.includes(locale) ? "orange" : undefined}>
                    {LOCALE_LABELS[locale]} {preview.by_locale[locale] ?? 0}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
            {campaign?.schedule_basis === "local" && (
              <Descriptions.Item label="타임존별 기기">
                <Space size={[0, 4]} wrap>
                  {Object.entries(preview.by_timezone)
                    .slice(0, 12)
                    .map(([tz, count]) => (
                      <Tag
                        key={tz || "unknown"}
                        color={campaign.dispatched_timezones.includes(tz) ? "green" : undefined}
                      >
                        {tz || "미설정"} {count}
                      </Tag>
                    ))}
                  {Object.keys(preview.by_timezone).length > 12 && (
                    <Typography.Text type="secondary">
                      외 {Object.keys(preview.by_timezone).length - 12}개
                    </Typography.Text>
                  )}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            언어는 기기의 앱 언어 → 국가(타임존) → 영어 순으로 자동 배정됩니다. 저장된 내용 기준이며, 실제
            대상은 발송 시점에 다시 계산됩니다.
          </Typography.Paragraph>
          {preview.fallback_locales.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message={`번역이 없는 언어: ${preview.fallback_locales.map((l) => LOCALE_LABELS[l]).join(", ")}`}
              description="해당 기기에는 영어(없으면 한국어) 문구가 발송됩니다."
            />
          )}
        </Card>
      )}

      {campaign && !isDraft && campaign.status !== "scheduled" && (
        <Card title="발송 결과" style={{ marginBottom: 16 }}>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="발송 유저">{campaign.recipient_count}</Descriptions.Item>
            <Descriptions.Item label="발송 기기">{campaign.device_count}</Descriptions.Item>
            <Descriptions.Item label="발송 기준">
              <ScheduleText campaign={campaign} />
            </Descriptions.Item>
            <Descriptions.Item label="발송 완료">
              {campaign.sent_at ? dayjs(campaign.sent_at).format("YYYY-MM-DD HH:mm") : "—"}
            </Descriptions.Item>
            {campaign.schedule_basis === "local" && (
              <Descriptions.Item label="처리한 타임존" span={2}>
                {campaign.dispatched_timezones.length
                  ? campaign.dispatched_timezones.map((tz) => <Tag key={tz || "unknown"}>{tz || "미설정"}</Tag>)
                  : "—"}
              </Descriptions.Item>
            )}
          </Descriptions>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            FCM 에 발행한 수입니다. 기기별 도달 결과는 Amplitude 의 push_notification_send
            (type=marketing, campaign_id={campaign.id}) 이벤트로 확인하세요.
          </Typography.Paragraph>
        </Card>
      )}

      <Card title="테스트 발송" style={{ marginBottom: 16 }}>
        <Form form={testForm} layout="inline">
          <Form.Item
            name="uid"
            rules={[{ required: true, whitespace: true, message: "유저 UID를 입력하세요." }]}
          >
            <Input placeholder="유저 UID (Users 상세에서 복사)" style={{ width: 320 }} />
          </Form.Item>
          <Form.Item name="locale">
            <Select
              allowClear
              placeholder="언어 (자동)"
              style={{ width: 200 }}
              options={PUSH_LOCALES.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))}
            />
          </Form.Item>
          <Button loading={testMutation.isPending} onClick={() => testMutation.mutate()}>
            {isDraft ? "저장 후 테스트 발송" : "테스트 발송"}
          </Button>
        </Form>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          해당 유저의 활성 기기 전부에 지금 발송합니다 (수신 동의 무시). 언어를 고르면 그 언어 문구로
          고정됩니다.
        </Typography.Paragraph>
      </Card>

      <Space wrap>
        {isDraft && (
          <>
            <Button loading={saveMutation.isPending} disabled={busy} onClick={() => saveMutation.mutate()}>
              저장
            </Button>
            <Popconfirm
              title="입력한 발송 시각으로 예약할까요?"
              description="저장 후 예약됩니다. 예약 시각 전에는 취소할 수 있습니다."
              onConfirm={() => scheduleMutation.mutate()}
            >
              <Button
                type="primary"
                icon={<ClockCircleOutlined />}
                loading={scheduleMutation.isPending}
                disabled={busy}
              >
                예약 발송
              </Button>
            </Popconfirm>
          </>
        )}
        {(isDraft || campaign?.status === "scheduled") && (
          <Popconfirm
            title="지금 전체 대상에게 발송할까요?"
            description="예약 시각과 무관하게 즉시 발송되며 되돌릴 수 없습니다."
            okText="발송"
            okButtonProps={{ danger: true }}
            onConfirm={() => sendMutation.mutate()}
          >
            <Button danger icon={<SendOutlined />} loading={sendMutation.isPending} disabled={busy}>
              즉시 발송
            </Button>
          </Popconfirm>
        )}
        {(campaign?.status === "scheduled" ||
          (campaign?.status === "sending" && campaign.schedule_basis === "local")) && (
          <Popconfirm
            title={campaign.status === "scheduled" ? "예약을 취소할까요?" : "남은 타임존 발송을 중단할까요?"}
            description={
              campaign.status === "scheduled"
                ? "draft 로 돌아가 다시 수정·예약할 수 있습니다."
                : "이미 발송된 타임존은 되돌릴 수 없습니다."
            }
            onConfirm={() => cancelMutation.mutate()}
          >
            <Button loading={cancelMutation.isPending} disabled={busy}>
              {campaign.status === "scheduled" ? "예약 취소" : "발송 중단"}
            </Button>
          </Popconfirm>
        )}
      </Space>
    </div>
  );
}

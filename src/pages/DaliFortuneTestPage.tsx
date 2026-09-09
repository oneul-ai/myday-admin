import { useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Progress,
  Row,
  Select,
  Space,
  Tag,
  TimePicker,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type Dayjs } from "dayjs";
import {
  type FortuneHistoryEntry,
  type FortunePillar,
  type FortuneResult,
  type FortuneTestResponse,
  type FortuneTestRun,
  getFortuneProviders,
  testFortune,
} from "../api/dali";

const LANGUAGES = [
  { value: "ko", label: "한국어 (ko)" },
  { value: "en", label: "영어 (en)" },
  { value: "ja", label: "일본어 (ja)" },
  { value: "zh-Hans", label: "중국어 간체 (zh-Hans)" },
  { value: "zh-Hant", label: "중국어 번체 (zh-Hant)" },
];

interface FormValues {
  birth_date: Dayjs;
  birth_time: Dayjs | null;
  birth_calendar: "solar" | "lunar" | "lunar_leap";
  gender: "male" | "female";
  target_date: Dayjs | null;
  language: string;
  engine_only: boolean;
  chain_days: number;
}

function scoreColor(score: number) {
  if (score >= 70) return "#52c41a";
  if (score >= 50) return "#1677ff";
  if (score >= 40) return "#faad14";
  return "#ff4d4f";
}

const ELEMENT_LABELS: Record<string, { label: string; color: string }> = {
  wood: { label: "목(木)", color: "#52c41a" },
  fire: { label: "화(火)", color: "#ff4d4f" },
  earth: { label: "토(土)", color: "#faad14" },
  metal: { label: "금(金)", color: "#8c8c8c" },
  water: { label: "수(水)", color: "#1677ff" },
};

function pillarText(pillar: FortunePillar | null) {
  return pillar ? `${pillar.name}(${pillar.hanja})` : "-";
}

// 엔진 입력 JSON 의 time_guide / today.imagery — 운영자가 LLM 재료를 검산하는 용도.
interface EngineTimeWindow {
  hours: string;
  reasons: string[];
}
interface EngineMaterial {
  time_guide: Record<"focus" | "caution" | "rest", EngineTimeWindow> | null;
  imagery: {
    stem: string;
    branch: string;
    nayin: { name: string; hanja: string; image: string };
  } | null;
}

function readEngineMaterial(engineInput: Record<string, unknown>): EngineMaterial {
  const timeGuide = engineInput.time_guide as EngineMaterial["time_guide"] | undefined;
  const today = engineInput.today as { imagery?: EngineMaterial["imagery"] } | undefined;
  return { time_guide: timeGuide ?? null, imagery: today?.imagery ?? null };
}

const TIME_GUIDE_KINDS = [
  { key: "focus", label: "집중", color: "green" },
  { key: "caution", label: "조심", color: "volcano" },
  { key: "rest", label: "쉼", color: "cyan" },
] as const;

function FortuneCardView({
  fortune,
  title,
  extra,
}: {
  fortune: FortuneResult;
  title: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {title}
          </Typography.Text>
          <Space>
            <Tag color="magenta">{fortune.character}</Tag>
            <Typography.Text strong style={{ fontSize: 16 }}>
              {fortune.headline}
            </Typography.Text>
          </Space>
        </Space>
      }
      extra={extra}
      style={{ marginBottom: 16 }}
    >
      <Card size="small" style={{ marginBottom: 16, background: "#fff7e6" }}>
        <Space>
          <Tag color="orange">스포트라이트 · {fortune.spotlight.topic}</Tag>
          <Typography.Text>{fortune.spotlight.line}</Typography.Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {fortune.cards.map((card) => (
          <Col key={card.topic} xs={24} sm={12} md={8}>
            <Card
              size="small"
              title={card.topic}
              extra={
                card.topic === fortune.spotlight.topic && (
                  <Tag color="orange">스포트라이트</Tag>
                )
              }
            >
              <Progress
                percent={card.score}
                strokeColor={scoreColor(card.score)}
                format={(v) => `${v}점`}
              />
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                {card.message}
              </Typography.Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Card size="small" style={{ marginTop: 16, background: "#f6ffed" }}>
        <Space direction="vertical" size={2}>
          <Space>
            <Tag color="green">오늘의 퀘스트</Tag>
            <Typography.Text strong>{fortune.quest.title}</Typography.Text>
          </Space>
          <Typography.Text type="secondary">{fortune.quest.reason}</Typography.Text>
        </Space>
      </Card>

      <Typography.Paragraph style={{ marginTop: 16 }}>
        <Tag color="purple">달이의 한마디</Tag>
        {fortune.dali_comment}
      </Typography.Paragraph>
      <Typography.Paragraph>
        <Tag color="gold">오늘의 주문</Tag>
        <Typography.Text strong>{fortune.charm}</Typography.Text>
      </Typography.Paragraph>

      <Descriptions title="럭키 아이템" column={fortune.lucky_items.length} size="small">
        {fortune.lucky_items.map((item, index) => (
          <Descriptions.Item key={`${item.kind}-${index}`} label={item.kind}>
            {item.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
      <Descriptions title="오늘의 띠 궁합" column={2} size="small" style={{ marginTop: 16 }}>
        <Descriptions.Item label="잘 맞는 띠">
          {fortune.compatibility.good.length > 0 ? fortune.compatibility.good.join(", ") : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="조심할 띠">
          {fortune.compatibility.caution.length > 0
            ? fortune.compatibility.caution.join(", ")
            : "-"}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

function HistoryList({ entries }: { entries: FortuneHistoryEntry[] }) {
  if (entries.length === 0) {
    return <Typography.Text type="secondary">히스토리 없음 (첫날)</Typography.Text>;
  }
  return (
    <Space direction="vertical" size={4} style={{ width: "100%" }}>
      {entries.map((entry) => (
        <Typography.Text key={entry.date} style={{ fontSize: 12 }}>
          <Typography.Text type="secondary">{entry.date}</Typography.Text>{" "}
          {entry.character ?? "-"} · {entry.headline ?? "-"} · 스포트라이트{" "}
          {entry.spotlight ?? "-"} · 퀘스트 {entry.quest ?? "-"} · 럭키{" "}
          {entry.lucky_items.join(", ") || "-"}
        </Typography.Text>
      ))}
    </Space>
  );
}

function RunMaterial({ run }: { run: FortuneTestRun }) {
  const material = readEngineMaterial(run.engine_input);
  return (
    <Card
      size="small"
      title={`${run.target_date} — LLM 재료 (히스토리 · 헤드라인 형식 · 시간 흐름 · 물상)`}
      style={{ marginBottom: 16 }}
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label="recent_fortunes">
          <HistoryList entries={run.recent_fortunes} />
        </Descriptions.Item>
        <Descriptions.Item label="헤드라인 형식">
          {run.writing_style.headline_form}
        </Descriptions.Item>
        {material.time_guide && (
          <Descriptions.Item label="시간 흐름">
            <Space wrap>
              {TIME_GUIDE_KINDS.map(({ key, label, color }) => (
                <span key={key}>
                  <Tag color={color}>{label}</Tag>
                  {material.time_guide?.[key].hours}{" "}
                  <Typography.Text type="secondary">
                    ({material.time_guide?.[key].reasons.join(", ")})
                  </Typography.Text>
                </span>
              ))}
            </Space>
          </Descriptions.Item>
        )}
        {material.imagery && (
          <Descriptions.Item label="오늘의 물상">
            천간: {material.imagery.stem} · 지지: {material.imagery.branch} · 납음:{" "}
            {material.imagery.nayin.name}({material.imagery.nayin.hanja}) —{" "}
            {material.imagery.nayin.image}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
}

export default function DaliFortuneTestPage() {
  const [form] = Form.useForm<FormValues>();
  const [result, setResult] = useState<FortuneTestResponse | null>(null);
  // null 이면 서버 기본 프롬프트를 그대로 쓴다 (요청에 system_prompt 를 싣지 않음).
  const [systemPromptOverride, setSystemPromptOverride] = useState<string | null>(null);

  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ["dali-fortune-providers"],
    queryFn: getFortuneProviders,
  });
  const defaultPrompt = providers?.default_system_prompt ?? "";
  const systemPrompt = systemPromptOverride ?? defaultPrompt;
  const promptModified = systemPromptOverride !== null && systemPromptOverride !== defaultPrompt;

  const runMutation = useMutation({
    mutationFn: testFortune,
    onSuccess: setResult,
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      message.error(detail ?? "실행 실패");
    },
  });

  const handleRun = (values: FormValues) => {
    runMutation.mutate({
      birth_date: values.birth_date.format("YYYY-MM-DD"),
      birth_time: values.birth_time ? values.birth_time.format("HH:mm") : null,
      birth_calendar: values.birth_calendar,
      gender: values.gender,
      target_date: values.target_date
        ? values.target_date.format("YYYY-MM-DD")
        : undefined,
      language: values.language,
      engine_only: values.engine_only,
      chain_days: values.chain_days,
      system_prompt: promptModified ? systemPrompt : undefined,
    });
  };

  // 구버전 API(runs 없음) 호환: 최상위 필드로 단일 run 을 구성한다.
  const runs: FortuneTestRun[] =
    result?.runs ??
    (result
      ? [
          {
            target_date: "",
            engine_input: result.engine_input,
            basis: result.basis!,
            writing_style: result.writing_style ?? { headline_form: "" },
            recent_fortunes: [],
            fortune: result.fortune,
            latency_ms: result.latency_ms,
          },
        ]
      : []);
  const first = runs[0];

  return (
    <div style={{ maxWidth: 960 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        오늘의 운세 테스트
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        생년월일·생시·성별로 사주 엔진 입력을 계산하고, 실서비스와 같은 모델
        (gpt-5.6-sol)·프롬프트로 운세를 생성합니다. 유저 계정 없이 동작하며
        캐시를 남기지 않습니다. 연속 일수를 2 이상으로 두면 하루씩 이어
        생성하면서 앞선 결과를 히스토리(recent_fortunes)로 넘겨, 실서비스처럼
        반복 방지·연속성이 작동하는지 볼 수 있습니다.
      </Typography.Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="inline"
          onFinish={handleRun}
          initialValues={{
            gender: "male",
            language: "ko",
            engine_only: false,
            birth_time: null,
            birth_calendar: "solar",
            target_date: null,
            chain_days: 1,
          }}
        >
          <Form.Item
            name="birth_date"
            label="생년월일"
            rules={[{ required: true, message: "필수" }]}
          >
            <DatePicker placeholder="1990-03-05" />
          </Form.Item>
          <Form.Item name="birth_calendar" label="양/음력">
            <Select
              style={{ width: 130 }}
              options={[
                { value: "solar", label: "양력" },
                { value: "lunar", label: "음력" },
                { value: "lunar_leap", label: "음력 (윤달)" },
              ]}
            />
          </Form.Item>
          <Form.Item name="birth_time" label="생시" extra="모르면 비움">
            <TimePicker format="HH:mm" placeholder="14:30" />
          </Form.Item>
          <Form.Item name="gender" label="성별" rules={[{ required: true }]}>
            <Select
              style={{ width: 90 }}
              options={[
                { value: "male", label: "남성" },
                { value: "female", label: "여성" },
              ]}
            />
          </Form.Item>
          <Form.Item name="target_date" label="대상 날짜" extra="비우면 오늘">
            <DatePicker />
          </Form.Item>
          <Form.Item name="language" label="언어">
            <Select style={{ width: 180 }} options={LANGUAGES} />
          </Form.Item>
          <Form.Item name="chain_days" label="연속 일수" extra="1~7일, 하루씩 이어 생성">
            <InputNumber min={1} max={7} style={{ width: 70 }} />
          </Form.Item>
          <Form.Item name="engine_only" valuePropName="checked">
            <Checkbox>엔진 입력만 (LLM 생략)</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={runMutation.isPending}
            >
              실행
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Collapse
        style={{ marginBottom: 16 }}
        items={[
          {
            key: "prompt",
            label: (
              <Space>
                시스템 프롬프트
                {promptModified ? (
                  <Tag color="orange">수정됨 — 이 실행에만 적용</Tag>
                ) : (
                  <Tag>서버 기본값</Tag>
                )}
              </Space>
            ),
            extra: promptModified && (
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSystemPromptOverride(null);
                }}
              >
                기본값으로 되돌리기
              </Button>
            ),
            children: (
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <Typography.Text type="secondary">
                  편집한 본문이 기본 프롬프트 대신 전송됩니다. 출력 언어 블록(# Output
                  Language)은 서버가 항상 뒤에 붙이므로 여기 쓰지 않아도 됩니다. 실서비스
                  프롬프트는 바뀌지 않습니다 — 마음에 드는 버전은 코드
                  (app/services/fortune.py)에 반영해야 합니다.
                </Typography.Text>
                <Input.TextArea
                  value={systemPrompt}
                  disabled={providersLoading}
                  onChange={(e) => setSystemPromptOverride(e.target.value)}
                  autoSize={{ minRows: 12, maxRows: 40 }}
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
              </Space>
            ),
          },
        ]}
      />

      {runs.map((run, index) => (
        <div key={run.target_date || index}>
          {run.fortune && (
            <FortuneCardView
              fortune={run.fortune}
              title={
                runs.length > 1
                  ? `${index + 1}일차 · ${run.target_date}`
                  : run.target_date
              }
              extra={
                <Typography.Text type="secondary">
                  {result?.model_id} · {run.latency_ms}ms
                </Typography.Text>
              }
            />
          )}
          <RunMaterial run={run} />
        </div>
      ))}

      {first?.basis && (
        <Card
          title="사주 근거 (유저에게 보이는 검증 가능한 사실 — 첫날 기준)"
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Descriptions column={4} size="small">
            <Descriptions.Item label="년주">
              {pillarText(first.basis.natal_chart.year_pillar)}
            </Descriptions.Item>
            <Descriptions.Item label="월주">
              {pillarText(first.basis.natal_chart.month_pillar)}
            </Descriptions.Item>
            <Descriptions.Item label="일주">
              {pillarText(first.basis.natal_chart.day_pillar)}
            </Descriptions.Item>
            <Descriptions.Item label="시주">
              {pillarText(first.basis.natal_chart.hour_pillar)}
            </Descriptions.Item>
            <Descriptions.Item label="일간">
              {first.basis.natal_chart.day_master.name}(
              {first.basis.natal_chart.day_master.hanja}) ·{" "}
              {first.basis.natal_chart.day_master.element}
            </Descriptions.Item>
            <Descriptions.Item label="띠">
              {first.basis.natal_chart.zodiac_animal}띠
            </Descriptions.Item>
            <Descriptions.Item label="오늘의 일진" span={2}>
              {first.basis.today.name}({first.basis.today.hanja}) · 60갑자{" "}
              {first.basis.today.cycle_index}번째
            </Descriptions.Item>
          </Descriptions>
          <Row gutter={[16, 4]} style={{ marginTop: 8 }}>
            {Object.entries(first.basis.five_elements).map(([key, percent]) => (
              <Col key={key} flex="1 1 120px">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {ELEMENT_LABELS[key]?.label ?? key}
                </Typography.Text>
                <Progress
                  percent={percent}
                  strokeColor={ELEMENT_LABELS[key]?.color}
                  size="small"
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {first && (
        <Collapse
          items={[
            ...(result?.system_prompt_sent
              ? [
                  {
                    key: "prompt-sent",
                    label: "실제 전송된 시스템 프롬프트 (언어 블록 포함)",
                    children: (
                      <Input.TextArea
                        value={result.system_prompt_sent}
                        readOnly
                        autoSize={{ minRows: 6, maxRows: 24 }}
                        style={{ fontFamily: "monospace", fontSize: 11 }}
                      />
                    ),
                  },
                ]
              : []),
            {
              key: "engine",
              label: (
                <Space>
                  사주 엔진 입력 (LLM 에 전달되는 JSON — 첫날)
                  {first.fortune === null && <Tag>엔진 입력만 실행됨</Tag>}
                </Space>
              ),
              children: (
                <pre style={{ margin: 0, maxHeight: 480, overflow: "auto" }}>
                  {JSON.stringify(first.engine_input, null, 2)}
                </pre>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Tooltip,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import {
  DALI_QUOTE_LANGUAGES,
  getDaliQuoteProviders,
  recommendQuote,
  type DaliFewShot,
  type DaliRecommendQuoteResponse,
} from "../api/dali";

const { Text, Title } = Typography;

interface FewShotDraft {
  contextText: string;
  outputText: string;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

// 백엔드 dali_quote_service 와 동일한 컨텍스트: date(ISO) + weekday(영문)
// + recent_quotes(최근 30일 중복 제외 목록 — 테스트에선 직접 채워넣을 수 있음).
function buildQuoteContext(date: Dayjs): string {
  return pretty({
    date: date.format("YYYY-MM-DD"),
    weekday: date.format("dddd"),
    recent_quotes: [],
  });
}

export default function DaliQuoteRecommendPage() {
  const [targetDate, setTargetDate] = useState<Dayjs>(dayjs());
  const [contextText, setContextText] = useState(() => buildQuoteContext(dayjs()));
  const [contextError, setContextError] = useState<string | null>(null);
  const [systemPromptOverride, setSystemPromptOverride] = useState<string | null>(null);
  const [modelIdOverride, setModelIdOverride] = useState<string | null>(null);
  const [fewShots, setFewShots] = useState<FewShotDraft[]>([]);
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<DaliRecommendQuoteResponse | null>(null);

  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ["dali-quote-providers"],
    queryFn: getDaliQuoteProviders,
  });

  const systemPrompt = systemPromptOverride ?? providers?.default_system_prompt ?? "";
  const modelId = modelIdOverride ?? providers?.models[0]?.id ?? "";

  const run = useMutation({
    mutationFn: async () => {
      let context: Record<string, unknown>;
      try {
        context = JSON.parse(contextText);
      } catch (e) {
        throw new Error(`Context JSON 파싱 실패: ${(e as Error).message}`);
      }
      if (!modelId) throw new Error("모델을 선택해주세요");

      const fewShot: DaliFewShot[] = [];
      for (let i = 0; i < fewShots.length; i++) {
        const fs = fewShots[i];
        try {
          fewShot.push({
            context: JSON.parse(fs.contextText),
            output: JSON.parse(fs.outputText),
          });
        } catch (e) {
          throw new Error(`Few-shot #${i + 1} 파싱 실패: ${(e as Error).message}`);
        }
      }

      return recommendQuote({
        context,
        model_id: modelId,
        system_prompt: systemPrompt,
        few_shot: fewShot,
        thinking,
      });
    },
    onSuccess: (data) => {
      setResult(data);
      message.success(`완료 (${data.latency_ms}ms)`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } }; message?: string })
        ?.response?.data?.detail
        ?? (err as { message?: string }).message
        ?? "실행 실패";
      message.error(msg);
    },
  });

  const onContextBlur = () => {
    if (!contextText.trim()) {
      setContextError(null);
      return;
    }
    try {
      JSON.parse(contextText);
      setContextError(null);
    } catch (e) {
      setContextError((e as Error).message);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Title level={4}>달이 — 오늘의 명언 추천 테스트</Title>

      <Card title="1. 컨텍스트" size="small">
        <Row gutter={16} align="middle">
          <Col>
            <DatePicker
              value={targetDate}
              allowClear={false}
              onChange={(d) => {
                if (!d) return;
                setTargetDate(d);
                setContextText(buildQuoteContext(d));
                setContextError(null);
              }}
            />
          </Col>
          <Col>
            <Text type="secondary">
              명언은 유저 개인화 없이 날짜/요일을 컨텍스트로 사용합니다. 운영에선
              recent_quotes 에 최근 30일 명언이 들어가 중복을 제외합니다 — 테스트할 땐 직접 채워넣어 보세요.
            </Text>
          </Col>
        </Row>
        <Input.TextArea
          value={contextText}
          onChange={(e) => setContextText(e.target.value)}
          onBlur={onContextBlur}
          autoSize={{ minRows: 4, maxRows: 12 }}
          style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12 }}
          placeholder="{ ... }"
        />
        {contextError && (
          <Text type="danger" style={{ display: "block", marginTop: 4 }}>
            JSON 파싱 에러: {contextError}
          </Text>
        )}
      </Card>

      <Card
        title="2. System Prompt"
        size="small"
        extra={
          <Button
            size="small"
            disabled={!providers || systemPromptOverride === null}
            onClick={() => setSystemPromptOverride(null)}
          >
            기본값으로 리셋
          </Button>
        }
      >
        <Input.TextArea
          value={systemPrompt}
          onChange={(e) => setSystemPromptOverride(e.target.value)}
          autoSize={{ minRows: 8, maxRows: 30 }}
          style={{ fontFamily: "monospace", fontSize: 12 }}
        />
      </Card>

      <Card
        title="3. Few-shot 예시"
        size="small"
        extra={
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              setFewShots((arr) => [...arr, { contextText: "{}", outputText: "{}" }])
            }
          >
            예시 추가
          </Button>
        }
      >
        {fewShots.length === 0 && (
          <Empty description="Few-shot 예시 없음 (선택 사항)" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {fewShots.map((fs, idx) => (
            <Card
              key={idx}
              size="small"
              type="inner"
              title={`예시 #${idx + 1}`}
              extra={
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setFewShots((arr) => arr.filter((_, i) => i !== idx))}
                />
              }
            >
              <Row gutter={12}>
                <Col span={12}>
                  <Text strong>Input context</Text>
                  <Input.TextArea
                    value={fs.contextText}
                    onChange={(e) =>
                      setFewShots((arr) => arr.map((x, i) => (i === idx ? { ...x, contextText: e.target.value } : x)))
                    }
                    autoSize={{ minRows: 4, maxRows: 12 }}
                    style={{ fontFamily: "monospace", fontSize: 12, marginTop: 4 }}
                  />
                </Col>
                <Col span={12}>
                  <Text strong>Expected output</Text>
                  <Input.TextArea
                    value={fs.outputText}
                    onChange={(e) =>
                      setFewShots((arr) => arr.map((x, i) => (i === idx ? { ...x, outputText: e.target.value } : x)))
                    }
                    autoSize={{ minRows: 4, maxRows: 12 }}
                    style={{ fontFamily: "monospace", fontSize: 12, marginTop: 4 }}
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      </Card>

      <Card title="4. 실행" size="small">
        <Row gutter={16} align="middle">
          <Col>
            <Select
              style={{ width: 240 }}
              loading={providersLoading}
              value={modelId || undefined}
              onChange={setModelIdOverride}
              options={(providers?.models ?? []).map((m) => ({
                value: m.id,
                label: `${m.label} (${m.provider})`,
              }))}
              placeholder="모델 선택"
            />
          </Col>
          <Col>
            <Tooltip title="Gemini 2.5 reasoning. 운영은 thinking off (짧은 구조화 출력) 로 동작합니다.">
              <Space size={8}>
                <Switch checked={thinking} onChange={setThinking} />
                <Text>Thinking</Text>
              </Space>
            </Tooltip>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              loading={run.isPending}
              disabled={!contextText.trim() || !modelId || !!contextError}
              onClick={() => run.mutate()}
            >
              ▶ Run
            </Button>
          </Col>
        </Row>
      </Card>

      {run.isPending && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" tip="LLM 호출 중..." />
        </div>
      )}

      {result && !run.isPending && (
        <Card title="결과" size="small">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic title="Latency" value={result.latency_ms} suffix="ms" />
            </Col>
            <Col span={6}>
              <Statistic title="모델" value={result.model_id} />
            </Col>
          </Row>

          <Space direction="vertical" size="small" style={{ width: "100%", marginBottom: 16 }}>
            {DALI_QUOTE_LANGUAGES.map((lang) => {
              const entry = result.result.quotes?.[lang];
              if (!entry) return null;
              return (
                <Card
                  key={lang}
                  type="inner"
                  size="small"
                  title={lang}
                  style={{ background: "#fafafa" }}
                >
                  <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
                    “{entry.quote}”
                  </Title>
                  <Text style={{ color: "#555" }}>— {entry.author}</Text>
                </Card>
              );
            })}
          </Space>

          <Descriptions
            title="LLM에 보낸 입력"
            column={1}
            style={{ marginTop: 24 }}
            bordered
            size="small"
          >
            <Descriptions.Item label="System prompt">
              <Input.TextArea
                value={result.system_prompt_sent}
                readOnly
                autoSize={{ minRows: 4, maxRows: 12 }}
                style={{ fontFamily: "monospace", fontSize: 11 }}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Messages">
              <Input.TextArea
                value={pretty(result.messages_sent)}
                readOnly
                autoSize={{ minRows: 4, maxRows: 16 }}
                style={{ fontFamily: "monospace", fontSize: 11 }}
              />
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Space>
  );
}

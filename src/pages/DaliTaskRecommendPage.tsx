import { useMemo, useState } from "react";
import {
  AutoComplete,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getUsers, type User } from "../api/users";
import {
  getDaliContext,
  getDaliProviders,
  recommendTasks,
  type DaliFewShot,
  type DaliRecommendResponse,
} from "../api/dali";

const { Text, Title } = Typography;

interface FewShotDraft {
  contextText: string;
  outputText: string;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function DaliTaskRecommendPage() {
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [contextText, setContextText] = useState("");
  const [contextError, setContextError] = useState<string | null>(null);
  const [systemPromptOverride, setSystemPromptOverride] = useState<string | null>(null);
  const [modelIdOverride, setModelIdOverride] = useState<string | null>(null);
  const [fewShots, setFewShots] = useState<FewShotDraft[]>([]);
  const [result, setResult] = useState<DaliRecommendResponse | null>(null);

  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ["dali-providers"],
    queryFn: getDaliProviders,
  });

  const systemPrompt = systemPromptOverride ?? providers?.default_system_prompt ?? "";
  const modelId = modelIdOverride ?? providers?.models[0]?.id ?? "";

  const { data: userSearchData } = useQuery({
    queryKey: ["users-search", userSearch],
    queryFn: () => getUsers({ q: userSearch || undefined, limit: 10 }),
    enabled: userSearch.length >= 1,
  });

  const userOptions = useMemo(
    () =>
      (userSearchData?.users ?? []).map((u) => ({
        value: u.uid,
        label: `${u.name} <${u.email}>`,
        user: u,
      })),
    [userSearchData],
  );

  const loadContext = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error("유저를 먼저 선택해주세요");
      return getDaliContext(selectedUser.uid, timezone);
    },
    onSuccess: (data) => {
      setContextText(pretty(data));
      setContextError(null);
      message.success("컨텍스트 로드 완료");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } }; message?: string })
        ?.response?.data?.detail
        ?? (err as { message?: string }).message
        ?? "컨텍스트 로드 실패";
      message.error(msg);
    },
  });

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

      return recommendTasks({
        context,
        model_id: modelId,
        system_prompt: systemPrompt,
        few_shot: fewShot,
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
      <Title level={4}>달이 — Task 추천 테스트</Title>

      <Card title="1. 유저 & 컨텍스트" size="small">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <AutoComplete
              style={{ width: "100%" }}
              placeholder="이름/이메일로 유저 검색"
              options={userOptions}
              onSearch={setUserSearch}
              onSelect={(_, option) => {
                const opt = option as unknown as { user: User };
                setSelectedUser(opt.user);
              }}
              value={selectedUser ? `${selectedUser.name} <${selectedUser.email}>` : userSearch}
              onChange={(v) => {
                setUserSearch(v);
                if (selectedUser && v !== `${selectedUser.name} <${selectedUser.email}>`) {
                  setSelectedUser(null);
                }
              }}
              allowClear
            />
          </Col>
          <Col>
            <Input
              addonBefore="TZ"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={{ width: 220 }}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              loading={loadContext.isPending}
              disabled={!selectedUser}
              onClick={() => loadContext.mutate()}
            >
              컨텍스트 로드
            </Button>
          </Col>
        </Row>
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">
            서버에서 받은 컨텍스트 JSON. 자유롭게 편집한 값이 그대로 LLM에 전송됩니다.
          </Text>
          <Input.TextArea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            onBlur={onContextBlur}
            autoSize={{ minRows: 12, maxRows: 30 }}
            style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12 }}
            placeholder="{ ... }"
          />
          {contextError && (
            <Text type="danger" style={{ display: "block", marginTop: 4 }}>
              JSON 파싱 에러: {contextError}
            </Text>
          )}
        </div>
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
                    autoSize={{ minRows: 6, maxRows: 16 }}
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
                    autoSize={{ minRows: 6, maxRows: 16 }}
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
            <Col span={6}>
              <Statistic
                title="추천 개수"
                value={result.result.recommendations.length}
              />
            </Col>
          </Row>

          <Title level={5}>추천 Task</Title>
          <Table
            size="small"
            rowKey={(r) => `${r.start_time}-${r.title}`}
            dataSource={result.result.recommendations}
            pagination={false}
            columns={[
              {
                title: "시간",
                width: 130,
                render: (_, r) => (
                  <Tag color="blue">{r.start_time} – {r.end_time}</Tag>
                ),
              },
              {
                title: "분",
                dataIndex: "estimated_minutes",
                width: 60,
                render: (v: number) => `${v}m`,
              },
              { title: "Task", dataIndex: "title", width: 200 },
              { title: "Reason", dataIndex: "reason" },
            ]}
          />

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

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
  Progress,
  Row,
  Select,
  Space,
  Tag,
  TimePicker,
  Typography,
  message,
} from "antd";
import { useMutation } from "@tanstack/react-query";
import { type Dayjs } from "dayjs";
import {
  type FortunePillar,
  type FortuneTestResponse,
  testFortune,
} from "../api/dali";

const LANGUAGES = [
  { value: "ko", label: "한국어 (ko)" },
  { value: "en", label: "영어 (en)" },
  { value: "ja", label: "일본어 (ja)" },
  { value: "zh-Hans", label: "중국어 간체 (zh-Hans)" },
  { value: "zh-Hant", label: "중국어 번체 (zh-Hant)" },
];

const CATEGORY_LABELS: Record<string, string> = {
  overall: "총운",
  work_study: "일·공부",
  relationship: "관계",
  money: "재물",
  wellbeing: "컨디션",
};

interface FormValues {
  birth_date: Dayjs;
  birth_time: Dayjs | null;
  gender: "male" | "female";
  target_date: Dayjs | null;
  language: string;
  engine_only: boolean;
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

export default function DaliFortuneTestPage() {
  const [form] = Form.useForm<FormValues>();
  const [result, setResult] = useState<FortuneTestResponse | null>(null);

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
      gender: values.gender,
      target_date: values.target_date
        ? values.target_date.format("YYYY-MM-DD")
        : undefined,
      language: values.language,
      engine_only: values.engine_only,
    });
  };

  const fortune = result?.fortune;

  return (
    <div style={{ maxWidth: 960 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        오늘의 운세 테스트
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        생년월일·생시·성별로 사주 엔진 입력을 계산하고, 실서비스와 같은 모델
        (gpt-5.6-sol)·프롬프트로 운세를 생성합니다. 유저 계정 없이 동작하며
        캐시를 남기지 않습니다.
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
            target_date: null,
          }}
        >
          <Form.Item
            name="birth_date"
            label="생년월일"
            rules={[{ required: true, message: "필수" }]}
          >
            <DatePicker placeholder="1990-03-05" />
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

      {fortune && (
        <Card
          title={fortune.headline}
          extra={
            result && (
              <Typography.Text type="secondary">
                {result.model_id} · {result.latency_ms}ms
              </Typography.Text>
            )
          }
          style={{ marginBottom: 16 }}
        >
          <Typography.Paragraph>{fortune.summary}</Typography.Paragraph>
          {fortune.dali_comment && (
            <Typography.Paragraph>
              <Tag color="purple">달이의 한 마디</Tag>
              {fortune.dali_comment}
            </Typography.Paragraph>
          )}
          {fortune.charm && (
            <Typography.Paragraph>
              <Tag color="gold">오늘의 주문</Tag>
              <Typography.Text strong>{fortune.charm}</Typography.Text>
            </Typography.Paragraph>
          )}
          {fortune.mission && (
            <Card
              size="small"
              style={{ marginBottom: 16, background: "#f6ffed" }}
            >
              <Space direction="vertical" size={2}>
                <Space>
                  <Tag color="green">오늘의 미션</Tag>
                  <Typography.Text strong>
                    {fortune.mission.title}
                  </Typography.Text>
                </Space>
                <Typography.Text type="secondary">
                  {fortune.mission.reason}
                </Typography.Text>
              </Space>
            </Card>
          )}
          <Row gutter={[16, 16]}>
            {Object.entries(fortune.categories).map(([key, category]) => (
              <Col key={key} xs={24} sm={12} md={8}>
                <Card size="small" title={CATEGORY_LABELS[key] ?? key}>
                  <Progress
                    percent={category.score}
                    strokeColor={scoreColor(category.score)}
                    format={(v) => `${v}점`}
                  />
                  <Typography.Paragraph style={{ marginBottom: 0 }}>
                    {category.message}
                  </Typography.Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
          <Descriptions
            title="럭키 아이템"
            column={5}
            size="small"
            style={{ marginTop: 16 }}
          >
            <Descriptions.Item label="색상">
              {fortune.lucky.color ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="숫자">
              {fortune.lucky.number ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="방향">
              {fortune.lucky.direction ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="시간">
              {fortune.lucky.time ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="음식">
              {fortune.lucky.food ?? "-"}
            </Descriptions.Item>
          </Descriptions>
          {fortune.compatibility && (
            <Descriptions
              title="오늘의 띠 궁합"
              column={2}
              size="small"
              style={{ marginTop: 16 }}
            >
              <Descriptions.Item label="잘 맞는 띠">
                {fortune.compatibility.good.length > 0
                  ? fortune.compatibility.good.join(", ")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="조심할 띠">
                {fortune.compatibility.caution.length > 0
                  ? fortune.compatibility.caution.join(", ")
                  : "-"}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      )}

      {result?.basis && (
        <Card
          title="사주 근거 (유저에게 보이는 검증 가능한 사실)"
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Descriptions column={4} size="small">
            <Descriptions.Item label="년주">
              {pillarText(result.basis.natal_chart.year_pillar)}
            </Descriptions.Item>
            <Descriptions.Item label="월주">
              {pillarText(result.basis.natal_chart.month_pillar)}
            </Descriptions.Item>
            <Descriptions.Item label="일주">
              {pillarText(result.basis.natal_chart.day_pillar)}
            </Descriptions.Item>
            <Descriptions.Item label="시주">
              {pillarText(result.basis.natal_chart.hour_pillar)}
            </Descriptions.Item>
            <Descriptions.Item label="일간">
              {result.basis.natal_chart.day_master.name}(
              {result.basis.natal_chart.day_master.hanja}) ·{" "}
              {result.basis.natal_chart.day_master.element}
            </Descriptions.Item>
            <Descriptions.Item label="띠">
              {result.basis.natal_chart.zodiac_animal}띠
            </Descriptions.Item>
            <Descriptions.Item label="오늘의 일진" span={2}>
              {result.basis.today.name}({result.basis.today.hanja}) · 60갑자{" "}
              {result.basis.today.cycle_index}번째
            </Descriptions.Item>
          </Descriptions>
          <Row gutter={[16, 4]} style={{ marginTop: 8 }}>
            {Object.entries(result.basis.five_elements).map(([key, percent]) => (
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

      {result && (
        <Collapse
          items={[
            {
              key: "engine",
              label: (
                <Space>
                  사주 엔진 입력 (LLM 에 전달되는 JSON)
                  {result.fortune === null && <Tag>엔진 입력만 실행됨</Tag>}
                </Space>
              ),
              children: (
                <pre style={{ margin: 0, maxHeight: 480, overflow: "auto" }}>
                  {JSON.stringify(result.engine_input, null, 2)}
                </pre>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

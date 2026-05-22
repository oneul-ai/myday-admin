import { useMemo, useState } from "react";
import {
  Card,
  DatePicker,
  Radio,
  Space,
  Statistic,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getHourlySnapshots,
  type HourlyActivitySnapshot,
} from "../api/metrics";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const KST = "Asia/Seoul";

type MetricKey = Exclude<
  keyof HourlyActivitySnapshot,
  "window_start" | "window_end" | "updated_at"
>;

const METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
  { value: "active_users", label: "활성 유저" },
  { value: "signups", label: "가입" },
  { value: "withdrawals", label: "탈퇴" },
  { value: "tasks_created", label: "Task 생성" },
  { value: "tasks_completed", label: "Task 완료" },
  { value: "check_ins", label: "체크인" },
  { value: "check_outs", label: "체크아웃" },
];

const EMPTY_TOTALS: Record<MetricKey, number> = {
  active_users: 0,
  signups: 0,
  withdrawals: 0,
  tasks_created: 0,
  tasks_completed: 0,
  check_ins: 0,
  check_outs: 0,
};

export default function HourlyMetricsPage() {
  // 기본: 직전 7일. End 는 exclusive 라 현재 시각 그대로 둔다.
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().subtract(7, "day"),
    dayjs(),
  ]);
  const [from, to] = range;
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("active_users");

  const { data, isLoading } = useQuery({
    queryKey: ["hourly-metrics", from.toISOString(), to.toISOString()],
    queryFn: () =>
      getHourlySnapshots({
        from: from.toISOString(),
        to: to.toISOString(),
      }),
  });

  // 차트는 시간 흐름 정방향 (왼쪽=과거, 오른쪽=현재).
  const chartData = useMemo(
    () =>
      (data?.items ?? []).map((r) => ({
        ts: r.window_start,
        label: dayjs(r.window_start).tz(KST).format("MM/DD HH:mm"),
        value: r[selectedMetric],
      })),
    [data?.items, selectedMetric],
  );

  // 테이블은 최신부터 (운영상 모니터링 흐름과 일치).
  const rows = useMemo(
    () => [...(data?.items ?? [])].reverse(),
    [data?.items],
  );

  const totals = useMemo(
    () =>
      (data?.items ?? []).reduce<Record<MetricKey, number>>(
        (acc, r) => ({
          active_users: acc.active_users + r.active_users,
          signups: acc.signups + r.signups,
          withdrawals: acc.withdrawals + r.withdrawals,
          tasks_created: acc.tasks_created + r.tasks_created,
          tasks_completed: acc.tasks_completed + r.tasks_completed,
          check_ins: acc.check_ins + r.check_ins,
          check_outs: acc.check_outs + r.check_outs,
        }),
        { ...EMPTY_TOTALS },
      ),
    [data?.items],
  );

  const selectedLabel = METRIC_OPTIONS.find((o) => o.value === selectedMetric)?.label ?? "";

  const columns = useMemo(
    () => [
      {
        title: "윈도우 시작 (KST)",
        dataIndex: "window_start",
        width: 160,
        render: (v: string) => dayjs(v).tz(KST).format("MM/DD HH:00"),
      },
      {
        title: "활성 유저",
        dataIndex: "active_users",
        width: 100,
        align: "right" as const,
      },
      { title: "가입", dataIndex: "signups", width: 80, align: "right" as const },
      { title: "탈퇴", dataIndex: "withdrawals", width: 80, align: "right" as const },
      { title: "Task 생성", dataIndex: "tasks_created", width: 110, align: "right" as const },
      { title: "Task 완료", dataIndex: "tasks_completed", width: 110, align: "right" as const },
      { title: "체크인", dataIndex: "check_ins", width: 90, align: "right" as const },
      { title: "체크아웃", dataIndex: "check_outs", width: 100, align: "right" as const },
    ],
    [],
  );

  return (
    <>
      <Typography.Title level={4}>활동 다이제스트</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        0/8/16시 KST 마다 myday-worker 가 직전 8시간 윈도우의 카운트를 저장한 결과.
        빈 슬롯은 워커가 그 시점에 못 돌았다는 뜻 (장애 시그널).
      </Typography.Paragraph>

      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker.RangePicker
          showTime={{ format: "HH:mm" }}
          format="YYYY-MM-DD HH:mm"
          value={range}
          allowClear={false}
          onChange={(v) => {
            if (v && v[0] && v[1]) setRange([v[0], v[1]]);
          }}
        />
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Tooltip title="구간 내 윈도우별 활성 유저 카운트의 단순 합 — 같은 사람이 여러 윈도우에 활성이면 중복 가산됨.">
            <Statistic title="활성 유저 (합산)" value={totals.active_users} />
          </Tooltip>
          <Statistic title="가입" value={totals.signups} />
          <Statistic title="탈퇴" value={totals.withdrawals} />
          <Statistic title="Task 생성" value={totals.tasks_created} />
          <Statistic title="Task 완료" value={totals.tasks_completed} />
          <Statistic title="체크인" value={totals.check_ins} />
          <Statistic title="체크아웃" value={totals.check_outs} />
        </Space>
      </Card>

      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={`${selectedLabel} 시계열`}
        extra={
          <Radio.Group
            size="small"
            optionType="button"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
            options={METRIC_OPTIONS}
          />
        }
        loading={isLoading}
      >
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="label"
                minTickGap={40}
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
              <ChartTooltip
                formatter={(v) => [String(v), selectedLabel]}
                labelFormatter={(l) => `${l} (KST)`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1677ff"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Table<HourlyActivitySnapshot>
        dataSource={rows}
        loading={isLoading}
        rowKey="window_start"
        columns={columns}
        size="small"
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} windows`,
        }}
      />
    </>
  );
}

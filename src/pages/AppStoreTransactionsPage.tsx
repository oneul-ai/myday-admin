import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Input,
  Popconfirm,
  Segmented,
  Space,
  Statistic,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import {
  backfillTransactions,
  formatMilliunits,
  getTransactionsSummary,
  type BackfillResult,
  type TransactionsSummaryRow,
} from "../api/appStore";
import AppStoreTransactionsTable from "../components/AppStoreTransactionsTable";

type Environment = "Production" | "Sandbox";

function errorDetail(err: unknown): string | undefined {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
}

export default function AppStoreTransactionsPage() {
  const queryClient = useQueryClient();
  // 집계 기본: 직전 30일. to 는 exclusive 라 현재 시각 그대로.
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(30, "day"), dayjs()]);
  const [from, to] = range;
  const [environment, setEnvironment] = useState<Environment>("Production");
  const [uidInput, setUidInput] = useState("");
  const [otidInput, setOtidInput] = useState("");
  const [filters, setFilters] = useState<{ user_uid?: string; original_transaction_id?: string }>({});
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["appStoreSummary", from.toISOString(), to.toISOString(), environment],
    queryFn: () =>
      getTransactionsSummary({ from: from.toISOString(), to: to.toISOString(), environment }),
  });

  const totals = useMemo(() => {
    const rows = summary?.rows ?? [];
    return {
      count: rows.reduce((a, r) => a + r.count, 0),
      refunded: rows.reduce((a, r) => a + r.refunded_count, 0),
      currencies: rows.length,
    };
  }, [summary?.rows]);

  const backfillMutation = useMutation({
    mutationFn: () => backfillTransactions(),
    onSuccess: (res) => {
      setBackfillResult(res);
      message.success(`백필 완료 — 신규 ${res.created}건, 갱신 ${res.updated}건`);
      queryClient.invalidateQueries({ queryKey: ["appStoreTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["appStoreSummary"] });
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "백필에 실패했습니다");
    },
  });

  const applyFilters = () =>
    setFilters({
      user_uid: uidInput.trim() || undefined,
      original_transaction_id: otidInput.trim() || undefined,
    });

  const summaryColumns = [
    { title: "통화", dataIndex: "currency", width: 80, render: (v: string | null) => v ?? "-" },
    { title: "국가", dataIndex: "storefront", width: 80, render: (v: string | null) => v ?? "-" },
    { title: "건수", dataIndex: "count", width: 80, align: "right" as const },
    {
      title: "총액",
      dataIndex: "gross_milliunits",
      align: "right" as const,
      render: (v: number, r: TransactionsSummaryRow) => formatMilliunits(v, r.currency),
    },
    {
      title: "환불",
      key: "refunded",
      align: "right" as const,
      render: (_: unknown, r: TransactionsSummaryRow) =>
        r.refunded_count > 0
          ? `${formatMilliunits(r.refunded_milliunits, r.currency)} (${r.refunded_count}건)`
          : "-",
    },
    {
      title: "순액",
      dataIndex: "net_milliunits",
      align: "right" as const,
      render: (v: number, r: TransactionsSummaryRow) => <b>{formatMilliunits(v, r.currency)}</b>,
    },
  ];

  return (
    <>
      <Typography.Title level={4}>App Store 결제</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8, maxWidth: 820 }}>
        Apple 서버 알림으로 적재되는 결제 원장(app_store_transactions). 구독 갱신·환불 회차별로
        1행이며, 금액은 유저 결제가(세금 포함 스토어는 세금 포함)로 Apple 수수료 차감 전입니다.
        정산액은 App Store Connect 재무 리포트를 보세요. 기본은 Production 만 집계합니다.
      </Typography.Paragraph>

      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title="기간 집계"
        extra={
          <Space wrap>
            <Segmented<Environment>
              size="small"
              value={environment}
              onChange={setEnvironment}
              options={["Production", "Sandbox"]}
            />
            <DatePicker.RangePicker
              size="small"
              showTime={{ format: "HH:mm" }}
              format="YYYY-MM-DD HH:mm"
              value={range}
              allowClear={false}
              onChange={(v) => {
                if (v && v[0] && v[1]) setRange([v[0], v[1]]);
              }}
            />
          </Space>
        }
        loading={summaryLoading}
      >
        <Space size="large" wrap style={{ marginBottom: 12 }}>
          <Statistic title="결제 건수" value={totals.count} />
          <Statistic title="환불 건수" value={totals.refunded} />
          <Statistic title="통화·국가 조합" value={totals.currencies} />
        </Space>
        <Table<TransactionsSummaryRow>
          dataSource={summary?.rows ?? []}
          rowKey={(r) => `${r.currency}-${r.storefront}`}
          size="small"
          pagination={false}
          columns={summaryColumns}
          locale={{ emptyText: "해당 기간·환경에 결제가 없습니다" }}
        />
      </Card>

      <Card
        size="small"
        title="결제 내역"
        extra={
          <Space wrap>
            <Input
              size="small"
              placeholder="유저 UID"
              allowClear
              style={{ width: 220 }}
              value={uidInput}
              onChange={(e) => setUidInput(e.target.value)}
              onPressEnter={applyFilters}
            />
            <Input
              size="small"
              placeholder="Original Transaction ID"
              allowClear
              style={{ width: 200 }}
              value={otidInput}
              onChange={(e) => setOtidInput(e.target.value)}
              onPressEnter={applyFilters}
            />
            <Button size="small" onClick={applyFilters}>
              검색
            </Button>
            <Tooltip title="Apple transaction history API 로 모든 구독 계열의 결제 이력을 다시 받아 원장을 채웁니다. 멱등이며 이미 있는 행은 갱신됩니다. 구독 수만큼 Apple 을 호출합니다.">
              <Popconfirm
                title="원장 백필을 실행할까요?"
                description="현재 선택된 API 환경(DEV/PROD)의 Apple 자격증명으로 호출합니다."
                okText="실행"
                onConfirm={() => backfillMutation.mutate()}
              >
                <Button size="small" icon={<ReloadOutlined />} loading={backfillMutation.isPending}>
                  Apple 에서 백필
                </Button>
              </Popconfirm>
            </Tooltip>
          </Space>
        }
      >
        {backfillResult && (
          <Alert
            type={backfillResult.failed.length ? "warning" : "success"}
            showIcon
            closable
            onClose={() => setBackfillResult(null)}
            style={{ marginBottom: 12 }}
            message={`백필 결과 — 구독 계열 ${backfillResult.lineages}개, 트랜잭션 ${backfillResult.fetched}건 수신, 신규 ${backfillResult.created} / 갱신 ${backfillResult.updated}`}
            description={
              backfillResult.failed.length
                ? `실패한 계열: ${backfillResult.failed.join(", ")}`
                : undefined
            }
          />
        )}
        <AppStoreTransactionsTable filters={{ ...filters, environment }} />
      </Card>
    </>
  );
}

import { useMemo, useState } from "react";
import { Space, Table, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import {
  formatMilliunits,
  getTransactions,
  type AppStoreTransaction,
  type ListTransactionsParams,
} from "../api/appStore";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const KST = "Asia/Seoul";

const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
  notification: { label: "웹훅", color: "blue" },
  fallback: { label: "폴백 검증", color: "geekblue" },
  backfill: { label: "백필", color: "default" },
};

// Apple offerType: 1 introductory, 2 promotional, 3 offer code, 4 win-back
const OFFER_TYPE_LABEL: Record<number, string> = {
  1: "입문 할인",
  2: "프로모션",
  3: "오퍼 코드",
  4: "윈백",
};

function statusOf(tx: AppStoreTransaction): { label: string; color: string } {
  if (tx.revoked_at) return { label: "환불", color: "red" };
  if (tx.expires_at && dayjs(tx.expires_at).isBefore(dayjs())) return { label: "만료", color: "default" };
  return { label: "유효", color: "green" };
}

function fmt(iso: string | null) {
  return iso ? dayjs(iso).tz(KST).format("YYYY-MM-DD HH:mm") : "-";
}

export interface AppStoreTransactionsTableProps {
  filters: Omit<ListTransactionsParams, "offset" | "limit">;
  /** 유저 상세 탭처럼 유저가 고정된 맥락에서는 끈다. */
  showUserColumn?: boolean;
  pageSize?: number;
}

export default function AppStoreTransactionsTable({
  filters,
  showUserColumn = true,
  pageSize: initialPageSize = 20,
}: AppStoreTransactionsTableProps) {
  const [pagination, setPagination] = useState({ current: 1, pageSize: initialPageSize });
  const offset = (pagination.current - 1) * pagination.pageSize;

  const { data, isLoading } = useQuery({
    queryKey: ["appStoreTransactions", filters, offset, pagination.pageSize],
    queryFn: () => getTransactions({ ...filters, offset, limit: pagination.pageSize }),
  });

  const columns = useMemo<TableColumnsType<AppStoreTransaction>>(() => {
    const cols: TableColumnsType<AppStoreTransaction> = [
      {
        title: "구매 시각 (KST)",
        dataIndex: "purchased_at",
        width: 150,
        render: (v: string) => fmt(v),
      },
      {
        title: "금액",
        key: "price",
        width: 130,
        align: "right",
        render: (_, tx) => (
          <Tooltip title="유저 결제가 (Apple 수수료 차감 전). 2023-06 이전 트랜잭션은 비어 있을 수 있음.">
            <span>{formatMilliunits(tx.price_milliunits, tx.currency)}</span>
          </Tooltip>
        ),
      },
      {
        title: "국가",
        dataIndex: "storefront",
        width: 80,
        render: (v: string | null) => v ?? "-",
      },
      {
        title: "상태",
        key: "status",
        width: 90,
        render: (_, tx) => {
          const s = statusOf(tx);
          return (
            <Tooltip
              title={
                tx.revoked_at
                  ? `환불 ${fmt(tx.revoked_at)}${tx.revocation_reason === 1 ? " (앱 문제)" : ""}`
                  : tx.expires_at
                    ? `만료 ${fmt(tx.expires_at)}`
                    : undefined
              }
            >
              <Tag color={s.color}>{s.label}</Tag>
            </Tooltip>
          );
        },
      },
      {
        title: "상품",
        dataIndex: "product_id",
        width: 240,
        ellipsis: true,
        render: (v: string, tx) => (
          <Space direction="vertical" size={0}>
            <span>{v}</span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {tx.plan?.toUpperCase()}
              {tx.type ? ` · ${tx.type}` : ""}
              {tx.offer_type ? ` · ${OFFER_TYPE_LABEL[tx.offer_type] ?? `offer ${tx.offer_type}`}` : ""}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "환경",
        dataIndex: "environment",
        width: 100,
        render: (v: string | null) =>
          v === "Sandbox" ? <Tag color="orange">Sandbox</Tag> : <Tag>{v ?? "-"}</Tag>,
      },
      {
        title: "Transaction",
        key: "ids",
        width: 220,
        render: (_, tx) => (
          <Space direction="vertical" size={0}>
            <Typography.Text copyable style={{ fontSize: 12 }}>
              {tx.transaction_id}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              계열 {tx.original_transaction_id}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "유입",
        key: "source",
        width: 170,
        render: (_, tx) => {
          const m = SOURCE_LABEL[tx.source] ?? { label: tx.source, color: "default" };
          return (
            <Space direction="vertical" size={0}>
              <Tag color={m.color}>{m.label}</Tag>
              {tx.last_notification_type && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {tx.last_notification_type}
                  {tx.last_notification_subtype ? ` / ${tx.last_notification_subtype}` : ""}
                </Typography.Text>
              )}
            </Space>
          );
        },
      },
    ];
    if (showUserColumn) {
      cols.splice(4, 0, {
        title: "유저",
        dataIndex: "user_uid",
        width: 200,
        ellipsis: true,
        render: (v: string | null) =>
          v ? (
            <Link to={`/users/${v}`}>{v}</Link>
          ) : (
            <Tooltip title="appAccountToken 으로 유저를 찾지 못한 결제. 백필 또는 다음 알림에서 채워질 수 있음.">
              <Tag color="warning">미해결</Tag>
            </Tooltip>
          ),
      });
    }
    return cols;
  }, [showUserColumn]);

  const handleTableChange = (p: TablePaginationConfig) => {
    setPagination({ current: p.current ?? 1, pageSize: p.pageSize ?? initialPageSize });
  };

  return (
    <Table<AppStoreTransaction>
      dataSource={data?.items ?? []}
      loading={isLoading}
      rowKey="id"
      size="small"
      columns={columns}
      scroll={{ x: 1200 }}
      onChange={handleTableChange}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: data?.total ?? 0,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total}`,
      }}
    />
  );
}

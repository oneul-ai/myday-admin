import { useMemo, useState } from "react";
import { Space, Table, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import { formatMilliunits } from "../api/appStore";
import {
  GOOGLE_PLAY_STATUS_OPTIONS,
  getGooglePlayPurchases,
  type GooglePlayPurchase,
  type ListGooglePlayPurchasesParams,
} from "../api/googlePlay";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const KST = "Asia/Seoul";

function fmt(iso: string | null) {
  return iso ? dayjs(iso).tz(KST).format("YYYY-MM-DD HH:mm") : "-";
}

function statusTag(purchase: GooglePlayPurchase) {
  const option = GOOGLE_PLAY_STATUS_OPTIONS.find((o) => o.value === purchase.status);
  return <Tag color={option?.color ?? "default"}>{option?.label ?? purchase.status}</Tag>;
}

export interface GooglePlayPurchasesTableProps {
  filters: Omit<ListGooglePlayPurchasesParams, "offset" | "limit">;
  /** 유저 상세 탭처럼 유저가 고정된 맥락에서는 끈다. */
  showUserColumn?: boolean;
  pageSize?: number;
}

export default function GooglePlayPurchasesTable({
  filters,
  showUserColumn = true,
  pageSize: initialPageSize = 20,
}: GooglePlayPurchasesTableProps) {
  const [pagination, setPagination] = useState({ current: 1, pageSize: initialPageSize });
  const offset = (pagination.current - 1) * pagination.pageSize;

  const { data, isLoading } = useQuery({
    queryKey: ["googlePlayPurchases", filters, offset, pagination.pageSize],
    queryFn: () => getGooglePlayPurchases({ ...filters, offset, limit: pagination.pageSize }),
  });

  const columns = useMemo<TableColumnsType<GooglePlayPurchase>>(() => {
    const cols: TableColumnsType<GooglePlayPurchase> = [
      {
        title: "구매 시각 (KST)",
        dataIndex: "purchased_at",
        width: 150,
        render: (v: string) => fmt(v),
      },
      {
        title: "상태",
        key: "status",
        width: 150,
        render: (_, p) => (
          <Space direction="vertical" size={0}>
            <Tooltip title={p.subscription_state ? `Google: ${p.subscription_state}` : undefined}>
              {statusTag(p)}
            </Tooltip>
            {p.status === "active" && !p.auto_renew && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                해지 예약
              </Typography.Text>
            )}
            {p.grace_period_expires_at && (
              <Typography.Text type="warning" style={{ fontSize: 12 }}>
                결제 유예 ~{fmt(p.grace_period_expires_at)}
              </Typography.Text>
            )}
            {p.revoked_at && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                환불 {fmt(p.revoked_at)}
              </Typography.Text>
            )}
          </Space>
        ),
      },
      {
        title: "만료 (KST)",
        dataIndex: "expires_at",
        width: 150,
        render: (v: string | null) => fmt(v),
      },
      {
        title: "요금제",
        key: "plan",
        width: 260,
        ellipsis: true,
        render: (_, p) => (
          <Space direction="vertical" size={0}>
            <span>{p.base_plan_id ?? "-"}</span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {p.plan?.toUpperCase()} · {p.product_id}
              {p.offer_id ? ` · 혜택 ${p.offer_id}` : ""}
              {p.offer_phase === "free_trial" ? " · 무료 체험 중" : ""}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "다음 결제 금액",
        key: "price",
        width: 130,
        align: "right",
        render: (_, p) => (
          <Tooltip title="Google 의 정기 결제 금액(할인 미반영, 세금 별도 지역은 세전). 실제 청구 내역이 아닙니다.">
            <span>{formatMilliunits(p.renewal_price_milliunits, p.renewal_currency)}</span>
          </Tooltip>
        ),
      },
      {
        title: "국가",
        dataIndex: "region_code",
        width: 70,
        render: (v: string | null) => v ?? "-",
      },
      {
        title: "구분",
        key: "flags",
        width: 130,
        render: (_, p) => (
          <Space size={4} wrap>
            {p.is_test_purchase ? <Tag color="orange">테스트</Tag> : <Tag>실결제</Tag>}
            {!p.acknowledged && (
              <Tooltip title="서버가 아직 승인(acknowledge)하지 않은 구매 — 3일 안에 승인되지 않으면 Play 가 자동 환불합니다.">
                <Tag color="warning">미승인</Tag>
              </Tooltip>
            )}
          </Space>
        ),
      },
      {
        title: "주문",
        key: "order",
        width: 220,
        render: (_, p) => (
          <Space direction="vertical" size={0}>
            {p.latest_order_id ? (
              <Typography.Text copyable style={{ fontSize: 12 }}>
                {p.latest_order_id}
              </Typography.Text>
            ) : (
              "-"
            )}
            {p.has_linked_purchase_token && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                이전 구독을 이은 구매
              </Typography.Text>
            )}
          </Space>
        ),
      },
      {
        title: "갱신 (KST)",
        dataIndex: "updated_at",
        width: 150,
        render: (v: string) => fmt(v),
      },
    ];
    if (showUserColumn) {
      cols.splice(1, 0, {
        title: "유저",
        key: "user",
        width: 220,
        ellipsis: true,
        render: (_, p) => (
          <Space direction="vertical" size={0}>
            <Link to={`/users/${p.user_uid}`}>{p.user_email ?? p.user_uid}</Link>
            {p.user_email && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {p.user_uid}
              </Typography.Text>
            )}
          </Space>
        ),
      });
    }
    return cols;
  }, [showUserColumn]);

  const handleTableChange = (p: TablePaginationConfig) => {
    setPagination({ current: p.current ?? 1, pageSize: p.pageSize ?? initialPageSize });
  };

  return (
    <Table<GooglePlayPurchase>
      dataSource={data?.items ?? []}
      loading={isLoading}
      rowKey="id"
      size="small"
      columns={columns}
      scroll={{ x: 1400 }}
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

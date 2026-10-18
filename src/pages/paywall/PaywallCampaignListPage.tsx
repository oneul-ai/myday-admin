import { useMemo } from "react";
import {
  Button,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  PAYWALL_BADGE_OPTIONS,
  type PaywallCampaign,
  deletePaywallCampaign,
  getPaywallCampaigns,
  upsertPaywallCampaign,
} from "../../api/appSettings";

function errorDetail(err: unknown) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data
    ?.detail;
}

/** 서버의 노출 판정(켜짐 + 기간 안)을 목록에서도 같은 기준으로 표시한다. 버전 게이트는 제외. */
function paywallCampaignStatus(
  row: PaywallCampaign,
): "live" | "scheduled" | "ended" | "off" {
  if (!row.enabled) return "off";
  const now = dayjs();
  if (row.starts_at && now.isBefore(dayjs(row.starts_at))) return "scheduled";
  if (row.ends_at && !now.isBefore(dayjs(row.ends_at))) return "ended";
  return "live";
}

const STATUS_TAG = {
  live: <Tag color="green">노출 중</Tag>,
  scheduled: <Tag color="blue">예정</Tag>,
  ended: <Tag color="default">종료</Tag>,
  off: <Tag>꺼짐</Tag>,
};

const badgeLabel = (badge: PaywallCampaign["badge"]) =>
  PAYWALL_BADGE_OPTIONS.find((o) => o.value === badge)?.label ?? badge ?? "—";

export default function PaywallCampaignListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["paywall-campaigns"],
    queryFn: getPaywallCampaigns,
  });
  const campaigns = data?.campaigns ?? [];

  const moveMutation = useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) =>
      upsertPaywallCampaign(id, { position }),
    onSuccess: (list) => {
      queryClient.setQueryData(["paywall-campaigns"], list);
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "순서 변경 실패");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePaywallCampaign,
    onSuccess: (list) => {
      queryClient.setQueryData(["paywall-campaigns"], list);
      message.success("삭제되었습니다");
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "삭제 실패");
    },
  });

  const columns = useMemo(
    () => [
      {
        title: "우선순위",
        key: "priority",
        width: 90,
        render: (_: unknown, __: PaywallCampaign, index: number) => index + 1,
      },
      {
        title: "캠페인",
        key: "campaign",
        render: (_: unknown, row: PaywallCampaign) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{row.name || row.id}</Typography.Text>
            <Typography.Text code>{row.id}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "상태",
        key: "status",
        width: 90,
        render: (_: unknown, row: PaywallCampaign) =>
          STATUS_TAG[paywallCampaignStatus(row)],
      },
      {
        title: "배지",
        dataIndex: "badge",
        width: 110,
        render: badgeLabel,
      },
      {
        title: "연간 상품 ID",
        dataIndex: "yearly_product_id",
        render: (id: string | null) =>
          id ? (
            <Typography.Text code>{id}</Typography.Text>
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          ),
      },
      {
        title: "기간",
        key: "window",
        width: 260,
        render: (_: unknown, row: PaywallCampaign) => {
          const fmt = (iso: string | null) =>
            iso ? dayjs(iso).format("YYYY-MM-DD HH:mm") : "";
          return row.starts_at || row.ends_at ? (
            <Typography.Text>
              {fmt(row.starts_at)} ~ {fmt(row.ends_at)}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary">제한 없음</Typography.Text>
          );
        },
      },
      {
        title: "스토어",
        dataIndex: "storefronts",
        width: 150,
        render: (storefronts: string[] | null) =>
          storefronts?.length ? (
            <Space size={4} wrap>
              {storefronts.map((code) => (
                <Tag key={code}>{code}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">전체</Typography.Text>
          ),
      },
      {
        title: "마이 탭 배너",
        key: "banner",
        width: 130,
        render: (_: unknown, row: PaywallCampaign) =>
          row.banner?.enabled ? (
            <Tag color="purple">
              {row.banner.days_before_end ? `마감 ${row.banner.days_before_end}일 전부터` : "기간 내내"}
            </Tag>
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          ),
      },
      {
        title: "앱 버전",
        key: "versions",
        width: 130,
        render: (_: unknown, row: PaywallCampaign) =>
          row.min_app_version || row.max_app_version ? (
            <Typography.Text>
              {row.min_app_version ?? ""}~{row.max_app_version ?? ""}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary">제한 없음</Typography.Text>
          ),
      },
      {
        title: "",
        key: "actions",
        width: 140,
        render: (_: unknown, row: PaywallCampaign, index: number) => (
          <Space>
            <Button
              size="small"
              icon={<ArrowUpOutlined />}
              title="우선순위 올리기"
              disabled={index === 0 || moveMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
                moveMutation.mutate({ id: row.id, position: index - 1 });
              }}
            />
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              title="우선순위 내리기"
              disabled={
                index === campaigns.length - 1 || moveMutation.isPending
              }
              onClick={(e) => {
                e.stopPropagation();
                moveMutation.mutate({ id: row.id, position: index + 1 });
              }}
            />
            <Popconfirm
              title="캠페인을 삭제할까요?"
              description="설정이 즉시 사라지고 앱에는 정가 페이월이 보입니다. 이미 할인 상품으로 결제한 구독은 영향받지 않습니다."
              okText="삭제"
              okButtonProps={{ danger: true }}
              onConfirm={(e) => {
                e?.stopPropagation();
                deleteMutation.mutate(row.id);
              }}
              onCancel={(e) => e?.stopPropagation()}
            >
              <Button
                size="small"
                danger
                onClick={(e) => e.stopPropagation()}
              >
                삭제
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [campaigns.length, deleteMutation, moveMutation],
  );

  return (
    <div>
      <Space
        style={{
          marginBottom: 16,
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          페이월 캠페인
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/paywall/new")}
        >
          새 캠페인
        </Button>
      </Space>
      <Typography.Paragraph type="secondary">
        연간 할인 이벤트(얼리버드·새해)를 언제, 어느 스토어에 보여줄지
        정합니다. 할인가 자체는 App Store Connect 의 별도 연간 상품이고, 여기서는
        그 상품의 노출만 켜고 끕니다. 월간 상품은 항상 정가입니다. 켜진 캠페인이
        여러 개면 위에서부터 순서대로 내려가고, 앱은 자기 스토어에 맞는 첫
        캠페인을 씁니다.
      </Typography.Paragraph>

      <Table<PaywallCampaign>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={campaigns}
        pagination={false}
        onRow={(row) => ({
          onClick: () => navigate(`/paywall/${encodeURIComponent(row.id)}`),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}

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
  type MarketingCampaign,
  deleteMarketingCampaign,
  getMarketingCampaigns,
  upsertMarketingCampaign,
} from "../../api/appSettings";

function errorDetail(err: unknown) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data
    ?.detail;
}

export default function MarketingInAppListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["marketing-in-app"],
    queryFn: getMarketingCampaigns,
  });
  const campaigns = data?.campaigns ?? [];

  const moveMutation = useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) =>
      upsertMarketingCampaign(id, { position }),
    onSuccess: (list) => {
      queryClient.setQueryData(["marketing-in-app"], list);
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "순서 변경 실패");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMarketingCampaign,
    onSuccess: (list) => {
      queryClient.setQueryData(["marketing-in-app"], list);
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
        render: (_: unknown, __: MarketingCampaign, index: number) => index + 1,
      },
      {
        title: "이미지",
        dataIndex: "image_url",
        width: 110,
        render: (url: string | null) =>
          url ? (
            <img
              src={url}
              alt="인앱 메시지 이미지"
              style={{ height: 40, borderRadius: 4 }}
            />
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          ),
      },
      {
        title: "캠페인 ID",
        dataIndex: "id",
        render: (id: string) => <Typography.Text code>{id}</Typography.Text>,
      },
      {
        title: "노출",
        dataIndex: "enabled",
        width: 90,
        render: (enabled: boolean) =>
          enabled ? <Tag color="green">노출 중</Tag> : <Tag>꺼짐</Tag>,
      },
      {
        title: "언어별 설정",
        dataIndex: "localizations",
        width: 160,
        render: (localizations: MarketingCampaign["localizations"]) => {
          const locales = Object.keys(localizations ?? {});
          return locales.length ? (
            <Space size={4} wrap>
              {locales.map((locale) => (
                <Tag key={locale}>{locale}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          );
        },
      },
      {
        title: "노출 조건",
        key: "conditions",
        width: 220,
        render: (_: unknown, row: MarketingCampaign) => {
          const parts: string[] = [];
          if (row.min_app_version || row.max_app_version) {
            parts.push(
              `버전 ${row.min_app_version ?? ""}~${row.max_app_version ?? ""}`,
            );
          }
          if (row.ends_at) {
            parts.push(`~${dayjs(row.ends_at).format("YYYY-MM-DD HH:mm")}`);
          }
          return parts.length ? (
            <Space direction="vertical" size={0}>
              {parts.map((part) => (
                <Typography.Text key={part}>{part}</Typography.Text>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">제한 없음</Typography.Text>
          );
        },
      },
      {
        title: "",
        key: "actions",
        width: 140,
        render: (_: unknown, row: MarketingCampaign, index: number) => (
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
              description="저장된 설정이 즉시 사라지고 클라이언트에 더 이상 내려가지 않습니다."
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
          인앱 마케팅 메시지
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/marketing-in-app/new")}
        >
          새 캠페인
        </Button>
      </Space>
      <Typography.Paragraph type="secondary">
        캠페인 순서가 곧 노출 우선순위입니다 — 켜진 캠페인들이 위에서부터
        순서대로 클라이언트에 내려갑니다. 행을 누르면 상세를 볼 수 있습니다.
      </Typography.Paragraph>

      <Table<MarketingCampaign>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={campaigns}
        pagination={false}
        onRow={(row) => ({
          onClick: () =>
            navigate(`/marketing-in-app/${encodeURIComponent(row.id)}`),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}

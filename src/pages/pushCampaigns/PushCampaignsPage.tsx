import { useMemo, useState } from "react";
import { Button, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import type { TablePaginationConfig } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  deletePushCampaign,
  getPushCampaigns,
  PUSH_PLATFORM_LABELS,
  type ConsentRequirement,
  type PushCampaign,
  type PushCampaignStatus,
} from "../../api/pushCampaigns";
import ScheduleText from "./ScheduleText";
import { CONSENT_LABELS, STATUS_META, errorDetail } from "./shared";

export default function PushCampaignsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const offset = (pagination.current - 1) * pagination.pageSize;

  const { data, isLoading } = useQuery({
    queryKey: ["push-campaigns", { offset, limit: pagination.pageSize }] as const,
    queryFn: () => getPushCampaigns({ offset, limit: pagination.pageSize }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePushCampaign(id),
    onSuccess: () => {
      message.success("캠페인이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["push-campaigns"] });
    },
    onError: (err: unknown) => message.error(errorDetail(err) ?? "삭제 실패"),
  });

  const handleTableChange = (p: TablePaginationConfig) => {
    setPagination({ current: p.current ?? 1, pageSize: p.pageSize ?? 20 });
  };

  const columns = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 70 },
      {
        title: "캠페인",
        dataIndex: "name",
        render: (name: string, row: PushCampaign) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{name}</Typography.Text>
            <Typography.Text type="secondary" ellipsis style={{ maxWidth: 360 }}>
              {row.localizations.ko?.title}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "수신 동의 기준",
        dataIndex: "consent_requirements",
        width: 220,
        render: (v: ConsentRequirement[]) =>
          v.length ? (
            <Space size={[0, 4]} wrap>
              {v.map((r) => (
                <Tag key={r}>{CONSENT_LABELS[r] ?? r}</Tag>
              ))}
            </Space>
          ) : (
            <Tag color="orange">전체 유저</Tag>
          ),
      },
      {
        title: "플랫폼 · 최소 버전",
        key: "platforms",
        width: 170,
        render: (_: unknown, row: PushCampaign) => (
          <Space size={[0, 4]} wrap>
            {row.platforms.map((p) => (
              <Tag key={p}>
                {PUSH_PLATFORM_LABELS[p] ?? p}
                {row.min_app_versions[p] ? ` ≥ ${row.min_app_versions[p]}` : ""}
              </Tag>
            ))}
          </Space>
        ),
      },
      {
        title: "언어",
        dataIndex: "localizations",
        width: 150,
        render: (v: PushCampaign["localizations"]) => (
          <Space size={[0, 4]} wrap>
            {Object.keys(v).map((locale) => (
              <Tag key={locale} color="blue">
                {locale}
              </Tag>
            ))}
          </Space>
        ),
      },
      {
        title: "발송 예정",
        key: "schedule",
        width: 230,
        render: (_: unknown, row: PushCampaign) => <ScheduleText campaign={row} />,
      },
      {
        title: "상태",
        dataIndex: "status",
        width: 100,
        render: (s: PushCampaignStatus) => {
          const m = STATUS_META[s] ?? { label: s, color: "default" };
          return <Tag color={m.color}>{m.label}</Tag>;
        },
      },
      {
        title: "발송 유저 / 기기",
        key: "counts",
        width: 130,
        render: (_: unknown, row: PushCampaign) =>
          row.device_count ? (
            `${row.recipient_count} / ${row.device_count}`
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          ),
      },
      { title: "생성자", dataIndex: "created_by", width: 180, ellipsis: true },
      {
        title: "발송일",
        dataIndex: "sent_at",
        width: 150,
        render: (v: string | null) =>
          v ? dayjs(v).format("YYYY-MM-DD HH:mm") : <Typography.Text type="secondary">—</Typography.Text>,
      },
      {
        title: "",
        key: "actions",
        width: 80,
        render: (_: unknown, row: PushCampaign) =>
          row.status === "draft" && (
            <Popconfirm
              title="캠페인을 삭제할까요?"
              onConfirm={(e) => {
                e?.stopPropagation();
                deleteMutation.mutate(row.id);
              }}
              onCancel={(e) => e?.stopPropagation()}
            >
              <Button danger size="small" onClick={(e) => e.stopPropagation()}>
                삭제
              </Button>
            </Popconfirm>
          ),
      },
    ],
    [deleteMutation],
  );

  return (
    <div>
      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          푸시 캠페인
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/push-campaigns/new")}
        >
          새 캠페인
        </Button>
      </Space>

      <Table<PushCampaign>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items}
        scroll={{ x: "max-content" }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
        }}
        onChange={handleTableChange}
        onRow={(row) => ({
          onClick: () => navigate(`/push-campaigns/${row.id}`),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}

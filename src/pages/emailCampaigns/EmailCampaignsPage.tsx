import { useMemo, useState } from "react";
import { Button, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import type { TablePaginationConfig } from "antd";
import { PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  deleteEmailCampaign,
  getEmailCampaigns,
  syncSuppressions,
  type EmailCampaign,
  type EmailCampaignStatus,
} from "../../api/emailCampaigns";

const STATUS_META: Record<EmailCampaignStatus, { label: string; color: string }> = {
  draft: { label: "draft", color: "gold" },
  sending: { label: "sending", color: "blue" },
  sent: { label: "sent", color: "green" },
  failed: { label: "failed", color: "red" },
};

export default function EmailCampaignsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const offset = (pagination.current - 1) * pagination.pageSize;

  const { data, isLoading } = useQuery({
    queryKey: ["email-campaigns", { offset, limit: pagination.pageSize }] as const,
    queryFn: () => getEmailCampaigns({ offset, limit: pagination.pageSize }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEmailCampaign(id),
    onSuccess: () => {
      message.success("캠페인이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "삭제 실패");
    },
  });

  const syncMutation = useMutation({
    mutationFn: syncSuppressions,
    onSuccess: (r) => {
      message.success(
        `수신거부 동기화 완료 (${r.stream}) — 활성 ${r.total} / 신규 ${r.added} / 해제 ${r.released} / 마케팅 동의 해제 ${r.marketing_synced}`,
      );
      // 발송 대상 미리보기 카운트가 바뀔 수 있어 캠페인 조회를 갱신한다.
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "수신거부 동기화 실패");
    },
  });

  const handleTableChange = (p: TablePaginationConfig) => {
    setPagination({ current: p.current ?? 1, pageSize: p.pageSize ?? 20 });
  };

  const columns = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 70 },
      {
        title: "템플릿",
        dataIndex: "template_alias",
        render: (alias: string, row: EmailCampaign) => (
          <Space direction="vertical" size={0}>
            <Typography.Text code>{alias}</Typography.Text>
            {row.noname_template_alias && (
              <Typography.Text code type="secondary">
                {row.noname_template_alias}
              </Typography.Text>
            )}
          </Space>
        ),
      },
      {
        title: "대상",
        dataIndex: "marketing_agreed_only",
        width: 130,
        render: (v: boolean) =>
          v ? <Tag>마케팅 동의</Tag> : <Tag color="orange">전체 유저</Tag>,
      },
      {
        title: "상태",
        dataIndex: "status",
        width: 100,
        render: (s: EmailCampaignStatus) => {
          const m = STATUS_META[s] ?? { label: s, color: "default" };
          return <Tag color={m.color}>{m.label}</Tag>;
        },
      },
      {
        title: "수신자",
        dataIndex: "recipient_count",
        width: 90,
        render: (v: number | null) =>
          v ?? <Typography.Text type="secondary">—</Typography.Text>,
      },
      { title: "생성자", dataIndex: "created_by", width: 200, ellipsis: true },
      {
        title: "생성일",
        dataIndex: "created_at",
        width: 160,
        render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
      },
      {
        title: "발송일",
        dataIndex: "sent_at",
        width: 160,
        render: (v: string | null) =>
          v ? dayjs(v).format("YYYY-MM-DD HH:mm") : <Typography.Text type="secondary">—</Typography.Text>,
      },
      {
        title: "",
        key: "actions",
        width: 80,
        render: (_: unknown, row: EmailCampaign) =>
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
          이메일 캠페인
        </Typography.Title>
        <Space>
          <Popconfirm
            title="Postmark 수신거부 목록을 동기화할까요?"
            description="평상시엔 웹훅이 실시간 반영합니다. 웹훅 유실 보정이나 최초 백필에만 필요합니다."
            onConfirm={() => syncMutation.mutate()}
          >
            <Button icon={<SyncOutlined />} loading={syncMutation.isPending}>
              수신거부 동기화
            </Button>
          </Popconfirm>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/email-campaigns/new")}
          >
            새 캠페인
          </Button>
        </Space>
      </Space>

      <Table<EmailCampaign>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
        }}
        onChange={handleTableChange}
        onRow={(row) => ({
          onClick: () => navigate(`/email-campaigns/${row.id}`),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}

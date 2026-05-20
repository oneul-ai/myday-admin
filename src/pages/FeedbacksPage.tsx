import { useMemo, useState } from "react";
import {
  Descriptions,
  Drawer,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { TablePaginationConfig } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import {
  getFeedback,
  getFeedbacks,
  updateFeedback,
  type Feedback,
  type FeedbackStatus,
  type FeedbackType,
} from "../api/feedbacks";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

function formatUserLocalTime(iso: string, tz: string | null): string | null {
  if (!tz) return null;
  const m = dayjs(iso).tz(tz);
  return m.isValid() ? m.format("YYYY-MM-DD HH:mm:ss") : null;
}

const TYPE_OPTIONS: { value: FeedbackType; label: string; color: string }[] = [
  { value: "FEATURE_REQUEST", label: "기능 제안", color: "blue" },
  { value: "OPINION", label: "사용 의견", color: "geekblue" },
  { value: "BUG_REPORT", label: "문제 제보", color: "red" },
  { value: "OTHER", label: "기타", color: "default" },
];

const STATUS_OPTIONS: { value: FeedbackStatus; label: string; color: string }[] = [
  { value: "open", label: "open", color: "gold" },
  { value: "in_progress", label: "in_progress", color: "blue" },
  { value: "resolved", label: "resolved", color: "green" },
  { value: "wontfix", label: "wontfix", color: "default" },
];

function typeMeta(t: FeedbackType) {
  return TYPE_OPTIONS.find((o) => o.value === t) ?? { label: t, color: "default" };
}

function statusMeta(s: FeedbackStatus) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? { label: s, color: "default" };
}

export default function FeedbacksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<FeedbackType | undefined>();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [detailId, setDetailId] = useState<number | null>(null);

  const offset = (pagination.current - 1) * pagination.pageSize;

  const listQueryKey = [
    "feedbacks",
    { q: search, status: statusFilter, type: typeFilter, offset, limit: pagination.pageSize },
  ] as const;

  const { data, isLoading } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      getFeedbacks({
        q: search || undefined,
        status: statusFilter,
        type: typeFilter,
        offset,
        limit: pagination.pageSize,
      }),
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["feedback", detailId],
    queryFn: () => getFeedback(detailId!),
    enabled: detailId !== null,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: FeedbackStatus }) =>
      updateFeedback(id, { status }),
    onSuccess: (updated) => {
      message.success("상태가 업데이트되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      queryClient.setQueryData(["feedback", updated.id], updated);
    },
    onError: (err: unknown) => {
      const detailMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detailMsg ?? "업데이트 실패");
    },
  });

  const handleTableChange = (p: TablePaginationConfig) => {
    setPagination({ current: p.current ?? 1, pageSize: p.pageSize ?? 20 });
  };

  const resetToFirstPage = () => setPagination((p) => ({ ...p, current: 1 }));

  const columns = useMemo(
    () => [
      {
        title: "유형",
        dataIndex: "type",
        width: 110,
        render: (t: FeedbackType) => {
          const m = typeMeta(t);
          return <Tag color={m.color}>{m.label}</Tag>;
        },
      },
      {
        title: "상태",
        dataIndex: "status",
        width: 120,
        render: (s: FeedbackStatus) => {
          const m = statusMeta(s);
          return <Tag color={m.color}>{m.label}</Tag>;
        },
      },
      {
        title: "보낸 사람",
        dataIndex: "user_email",
        width: 220,
        render: (_: unknown, row: Feedback) => (
          <Space direction="vertical" size={0}>
            <span>{row.user_name ?? "(이름 없음)"}</span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.user_email ?? row.user_uid}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "내용",
        dataIndex: "content",
        ellipsis: true,
        render: (c: string) => (
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {c}
          </span>
        ),
      },
      {
        title: "플랫폼",
        dataIndex: "platform",
        width: 90,
        render: (p: string | null) => (p ? <Tag>{p}</Tag> : "-"),
      },
      {
        title: "앱 버전",
        dataIndex: "app_version",
        width: 110,
        render: (v: string | null, row: Feedback) =>
          v ? `${v}${row.build_number ? ` (${row.build_number})` : ""}` : "-",
      },
      {
        title: "보낸 시각",
        dataIndex: "created_at",
        width: 160,
        render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
      },
    ],
    [],
  );

  return (
    <>
      <Typography.Title level={4}>Feedbacks</Typography.Title>
      <Space style={{ marginBottom: 16 }} size="middle" wrap>
        <Input.Search
          placeholder="내용 / 이메일 / 이름으로 검색"
          allowClear
          onSearch={(v) => {
            setSearch(v);
            resetToFirstPage();
          }}
          style={{ width: 360 }}
        />
        <Select<FeedbackStatus>
          placeholder="상태"
          allowClear
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            resetToFirstPage();
          }}
          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <Select<FeedbackType>
          placeholder="유형"
          allowClear
          style={{ width: 160 }}
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v);
            resetToFirstPage();
          }}
          options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Space>

      <Table<Feedback>
        dataSource={data?.feedbacks}
        loading={isLoading}
        rowKey="id"
        columns={columns}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: data?.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total}`,
        }}
        onChange={handleTableChange}
        onRow={(record) => ({
          onClick: () => setDetailId(record.id),
          style: { cursor: "pointer" },
        })}
        size="middle"
      />

      <Drawer
        title={detailId ? `Feedback #${detailId}` : "Feedback"}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        width={560}
        destroyOnClose
        loading={isDetailLoading}
      >
        {detail && (
          <>
            <Space style={{ marginBottom: 16 }} size="middle" wrap>
              <Tag color={typeMeta(detail.type).color}>{typeMeta(detail.type).label}</Tag>
              <Select<FeedbackStatus>
                value={detail.status}
                style={{ width: 180 }}
                onChange={(v) => updateMutation.mutate({ id: detail.id, status: v })}
                loading={updateMutation.isPending}
                options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </Space>

            <Typography.Paragraph
              style={{
                whiteSpace: "pre-wrap",
                background: "#fafafa",
                padding: 12,
                borderRadius: 4,
                marginBottom: 24,
              }}
            >
              {detail.content}
            </Typography.Paragraph>

            <Descriptions
              column={1}
              size="small"
              bordered
              labelStyle={{ width: 140 }}
              items={[
                {
                  key: "user",
                  label: "보낸 사람",
                  children: (
                    <Space direction="vertical" size={0}>
                      <span>{detail.user_name ?? "(이름 없음)"}</span>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {detail.user_email ?? "-"}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }} copyable>
                        {detail.user_uid}
                      </Typography.Text>
                    </Space>
                  ),
                },
                {
                  key: "created_at",
                  label: "보낸 시각",
                  children: (() => {
                    const userLocal = formatUserLocalTime(detail.created_at, detail.timezone);
                    return (
                      <Space direction="vertical" size={0}>
                        <span>{dayjs(detail.created_at).format("YYYY-MM-DD HH:mm:ss")}</span>
                        {userLocal && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            유저 기준 {userLocal} ({detail.timezone})
                          </Typography.Text>
                        )}
                      </Space>
                    );
                  })(),
                },
                {
                  key: "timezone",
                  label: "타임존",
                  children: detail.timezone ?? "-",
                },
                {
                  key: "platform",
                  label: "플랫폼",
                  children: detail.platform ?? "-",
                },
                {
                  key: "app_version",
                  label: "앱 버전",
                  children: detail.app_version
                    ? `${detail.app_version}${detail.build_number ? ` (${detail.build_number})` : ""}`
                    : "-",
                },
                {
                  key: "os_version",
                  label: "OS 버전",
                  children: detail.os_version ?? "-",
                },
                {
                  key: "device_model",
                  label: "기기 모델",
                  children: detail.device_model ?? "-",
                },
                {
                  key: "locale",
                  label: "로케일",
                  children: detail.locale ?? "-",
                },
                {
                  key: "device_id",
                  label: "Device ID",
                  children: detail.device_id ? (
                    <Typography.Text copyable style={{ fontSize: 12 }}>
                      {detail.device_id}
                    </Typography.Text>
                  ) : (
                    "-"
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>
    </>
  );
}

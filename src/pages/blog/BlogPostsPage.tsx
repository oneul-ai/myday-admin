import { useMemo, useState } from "react";
import {
  Button,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { TablePaginationConfig } from "antd";
import { CloudUploadOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  deleteBlogPost,
  deploySite,
  getBlogPosts,
  type BlogPost,
  type BlogPostStatus,
} from "../../api/blogPosts";

const STATUS_OPTIONS: { value: BlogPostStatus; label: string; color: string }[] = [
  { value: "draft", label: "draft", color: "gold" },
  { value: "published", label: "published", color: "green" },
];

function statusMeta(s: BlogPostStatus) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? { label: s, color: "default" };
}

export default function BlogPostsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | undefined>();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const offset = (pagination.current - 1) * pagination.pageSize;

  const { data, isLoading } = useQuery({
    queryKey: [
      "blog-posts",
      { q: search, status: statusFilter, offset, limit: pagination.pageSize },
    ] as const,
    queryFn: () =>
      getBlogPosts({
        q: search || undefined,
        status: statusFilter,
        offset,
        limit: pagination.pageSize,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBlogPost(id),
    onSuccess: () => {
      message.success("글이 삭제되었습니다. 사이트 반영은 배포가 필요합니다.");
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "삭제 실패");
    },
  });

  const deployMutation = useMutation({
    mutationFn: () => deploySite(),
    onSuccess: () => {
      message.success("사이트 배포가 시작되었습니다. 수 분 내 반영됩니다.");
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "배포 트리거 실패");
    },
  });

  const handleTableChange = (p: TablePaginationConfig) => {
    setPagination({ current: p.current ?? 1, pageSize: p.pageSize ?? 20 });
  };

  const resetToFirstPage = () => setPagination((p) => ({ ...p, current: 1 }));

  const columns = useMemo(
    () => [
      {
        title: "Slug",
        dataIndex: "slug",
        width: 220,
        render: (slug: string) => <Typography.Text code>{slug}</Typography.Text>,
      },
      {
        title: "제목 (ko)",
        dataIndex: "titles",
        ellipsis: true,
        render: (titles: Record<string, string>) =>
          titles.ko ?? Object.values(titles)[0] ?? <Typography.Text type="secondary">—</Typography.Text>,
      },
      {
        title: "상태",
        dataIndex: "status",
        width: 110,
        render: (s: BlogPostStatus) => {
          const m = statusMeta(s);
          return <Tag color={m.color}>{m.label}</Tag>;
        },
      },
      {
        title: "언어",
        dataIndex: "titles",
        key: "locales",
        width: 160,
        render: (_: unknown, row: BlogPost) => {
          const locales = Object.keys(row.titles).filter((l) => row.bodies[l]);
          return locales.length
            ? locales.map((l) => <Tag key={l}>{l}</Tag>)
            : <Typography.Text type="secondary">—</Typography.Text>;
        },
      },
      {
        title: "발행일",
        dataIndex: "published_at",
        width: 160,
        render: (v: string | null) =>
          v ? dayjs(v).format("YYYY-MM-DD HH:mm") : <Typography.Text type="secondary">—</Typography.Text>,
      },
      {
        title: "수정일",
        dataIndex: "updated_at",
        width: 160,
        render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
      },
      {
        title: "",
        key: "actions",
        width: 80,
        render: (_: unknown, row: BlogPost) => (
          <Popconfirm
            title="글을 삭제할까요?"
            description="삭제 후 사이트 배포를 해야 실제 페이지가 내려갑니다."
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
        <Space>
          <Input.Search
            placeholder="slug / 제목 검색"
            allowClear
            style={{ width: 260 }}
            onSearch={(v) => {
              setSearch(v);
              resetToFirstPage();
            }}
          />
          <Select
            placeholder="상태"
            allowClear
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              resetToFirstPage();
            }}
            options={STATUS_OPTIONS.map(({ value, label }) => ({ value, label }))}
          />
        </Space>
        <Space>
          <Popconfirm
            title="사이트를 배포할까요?"
            description="발행된 글로 마케팅 사이트를 다시 빌드합니다 (수 분 소요)."
            onConfirm={() => deployMutation.mutate()}
          >
            <Button icon={<CloudUploadOutlined />} loading={deployMutation.isPending}>
              사이트 배포
            </Button>
          </Popconfirm>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/blog-posts/new")}>
            새 글
          </Button>
        </Space>
      </Space>

      <Table<BlogPost>
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
          onClick: () => navigate(`/blog-posts/${row.id}`),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}

import { Input, Space, Switch, Table, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getUsers, type User } from "../api/users";
import type { TableProps } from "antd";
import dayjs from "dayjs";

type SortField = "joined_at" | "last_signed_in_at";
const DEFAULT_SORT = { field: "joined_at" as SortField, order: "desc" as const };
const DEFAULT_PAGE_SIZE = 20;

// 목록 상태(검색어/페이지/정렬)를 URL 쿼리에 두어 상세 페이지에서 back 해도 유지되게 한다
function readListState(sp: URLSearchParams) {
  return {
    search: sp.get("q") ?? "",
    includeDeleted: sp.get("deleted") === "1",
    current: Math.max(1, Number(sp.get("page")) || 1),
    pageSize: Number(sp.get("size")) || DEFAULT_PAGE_SIZE,
    sort: {
      field: sp.get("sort") === "last_signed_in_at" ? ("last_signed_in_at" as const) : DEFAULT_SORT.field,
      order: sp.get("order") === "asc" ? ("asc" as const) : DEFAULT_SORT.order,
    },
  };
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { search, includeDeleted, current, pageSize, sort } = readListState(searchParams);

  const patchParams = (patch: Partial<ReturnType<typeof readListState>>) => {
    const next = { search, includeDeleted, current, pageSize, sort, ...patch };
    const sp = new URLSearchParams();
    if (next.search) sp.set("q", next.search);
    if (next.includeDeleted) sp.set("deleted", "1");
    if (next.current > 1) sp.set("page", String(next.current));
    if (next.pageSize !== DEFAULT_PAGE_SIZE) sp.set("size", String(next.pageSize));
    if (next.sort.field !== DEFAULT_SORT.field || next.sort.order !== DEFAULT_SORT.order) {
      sp.set("sort", next.sort.field);
      sp.set("order", next.sort.order);
    }
    setSearchParams(sp, { replace: true });
  };

  const offset = (current - 1) * pageSize;

  const { data, isLoading } = useQuery({
    queryKey: [
      "users",
      { q: search, offset, limit: pageSize, includeDeleted, sort },
    ],
    queryFn: () =>
      getUsers({
        q: search || undefined,
        offset,
        limit: pageSize,
        include_deleted: includeDeleted || undefined,
        sort: sort.field,
        order: sort.order,
      }),
  });

  const handleTableChange: TableProps<User>["onChange"] = (p, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const nextSort = s?.order
      ? {
          field: s.field as SortField,
          order: s.order === "ascend" ? ("asc" as const) : ("desc" as const),
        }
      : DEFAULT_SORT;
    const sortChanged = nextSort.field !== sort.field || nextSort.order !== sort.order;
    patchParams({
      sort: nextSort,
      current: sortChanged ? 1 : p.current ?? 1,
      pageSize: p.pageSize ?? DEFAULT_PAGE_SIZE,
    });
  };

  const sortOrderOf = (field: SortField) =>
    sort.field === field ? (sort.order === "asc" ? ("ascend" as const) : ("descend" as const)) : null;

  const columns: TableProps<User>["columns"] = [
    {
      title: "Status",
      dataIndex: "deleted_at",
      width: 90,
      render: (deleted_at: string | null) =>
        deleted_at ? <Tag color="red">탈퇴</Tag> : <Tag color="green">활성</Tag>,
    },
    {
      title: "Name",
      dataIndex: "name",
      width: 150,
      render: (name: string) =>
        name ? name : <Typography.Text type="secondary">비회원</Typography.Text>,
    },
    {
      title: "Email",
      dataIndex: "email",
      width: 250,
      render: (email: string) =>
        email ? email : <Typography.Text type="secondary">비회원</Typography.Text>,
    },
    {
      title: "Plan",
      dataIndex: "plan",
      width: 100,
      render: (plan: string) => {
        const color = plan === "FREE" ? "default" : "blue";
        return <Tag color={color}>{plan}</Tag>;
      },
    },
    {
      title: "User UID",
      dataIndex: "uid",
      width: 280,
    },
    {
      title: "Joined",
      dataIndex: "joined_at",
      width: 120,
      sorter: true,
      sortOrder: sortOrderOf("joined_at"),
      render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
    },
    {
      title: "Last Sign-in",
      dataIndex: "last_signed_in_at",
      width: 140,
      sorter: true,
      sortOrder: sortOrderOf("last_signed_in_at"),
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
  ];

  return (
    <>
      <Typography.Title level={4}>Users</Typography.Title>
      <Space style={{ marginBottom: 16 }} size="large" wrap>
        <Input.Search
          placeholder="Search by name, email, or uid"
          allowClear
          defaultValue={search}
          onSearch={(value) => patchParams({ search: value, current: 1 })}
          style={{ width: 400 }}
        />
        <Space>
          <Switch
            checked={includeDeleted}
            onChange={(checked) => patchParams({ includeDeleted: checked, current: 1 })}
          />
          <span>탈퇴 회원 포함</span>
        </Space>
      </Space>
      <Table<User>
        dataSource={data?.users}
        loading={isLoading}
        rowKey="uid"
        columns={columns}
        pagination={{
          current,
          pageSize,
          total: data?.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total}`,
        }}
        onChange={handleTableChange}
        onRow={(record) => ({
          onClick: () => navigate(`/users/${record.uid}`),
          style: {
            cursor: "pointer",
            ...(record.deleted_at ? { opacity: 0.55 } : {}),
          },
        })}
        size="middle"
      />
    </>
  );
}

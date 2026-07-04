import { useState } from "react";
import { Input, Space, Switch, Table, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getUsers, type User } from "../api/users";
import type { TablePaginationConfig } from "antd";
import dayjs from "dayjs";

export default function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const offset = (pagination.current - 1) * pagination.pageSize;

  const { data, isLoading } = useQuery({
    queryKey: ["users", { q: search, offset, limit: pagination.pageSize, includeDeleted }],
    queryFn: () =>
      getUsers({
        q: search || undefined,
        offset,
        limit: pagination.pageSize,
        include_deleted: includeDeleted || undefined,
      }),
  });

  const handleTableChange = (p: TablePaginationConfig) => {
    setPagination({ current: p.current ?? 1, pageSize: p.pageSize ?? 20 });
  };

  const columns = [
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
      render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
    },
    {
      title: "Last Sign-in",
      dataIndex: "last_signed_in_at",
      width: 140,
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
          onSearch={setSearch}
          style={{ width: 400 }}
        />
        <Space>
          <Switch checked={includeDeleted} onChange={setIncludeDeleted} />
          <span>탈퇴 회원 포함</span>
        </Space>
      </Space>
      <Table<User>
        dataSource={data?.users}
        loading={isLoading}
        rowKey="uid"
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

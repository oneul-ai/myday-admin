import { useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  type Admin,
  type AdminInput,
  createAdmin,
  deleteAdmin,
  getAdmins,
  updateAdmin,
} from "../api/admins";
import { useMe } from "../auth/useMe";

const ROLE_OPTIONS = [
  { value: "admin", label: "admin" },
  { value: "super_admin", label: "super_admin" },
];

const ACTIVE_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

interface FormValues {
  email: string;
  name?: string;
  role: string;
  is_active: boolean;
}

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<string | undefined>();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [form] = Form.useForm<FormValues>();

  const offset = (pagination.current - 1) * pagination.pageSize;

  const { data, isLoading } = useQuery({
    queryKey: ["admins", { q: search, role, activeFilter, offset, limit: pagination.pageSize }],
    queryFn: () =>
      getAdmins({
        q: search || undefined,
        role,
        is_active: activeFilter === undefined ? undefined : activeFilter === "true",
        offset,
        limit: pagination.pageSize,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createAdmin,
    onSuccess: () => {
      message.success("Admin created");
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Create failed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<AdminInput> }) => updateAdmin(id, body),
    onSuccess: () => {
      message.success("Admin updated");
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Update failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => {
      message.success("Admin deleted");
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Delete failed");
    },
  });

  const openCreateModal = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEditModal = (a: Admin) => {
    setEditing(a);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const initialValues: FormValues = editing
    ? {
        email: editing.email,
        name: editing.name ?? undefined,
        role: editing.role,
        is_active: editing.is_active,
      }
    : {
        email: "",
        role: "admin",
        is_active: true,
      };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const body: AdminInput = {
      email: values.email.trim().toLowerCase(),
      name: values.name?.trim() || null,
      role: values.role,
      is_active: values.is_active,
    };
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        body: { name: body.name, role: body.role, is_active: body.is_active },
      });
    } else {
      createMutation.mutate(body);
    }
  };

  const resetPage = () => setPagination((p) => ({ ...p, current: 1 }));
  const formatDateTime = (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-");

  const columns = [
    {
      title: "Email",
      dataIndex: "email",
      width: 260,
      render: (v: string, r: Admin) => (
        <Space>
          <span>{v}</span>
          {me?.id === r.id && <Tag color="gold">You</Tag>}
        </Space>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      width: 160,
      render: (v: string | null) => v ?? "-",
    },
    {
      title: "Role",
      dataIndex: "role",
      width: 130,
      render: (v: string) => <Tag color={v === "super_admin" ? "red" : "blue"}>{v}</Tag>,
    },
    {
      title: "Active",
      dataIndex: "is_active",
      width: 100,
      render: (v: boolean) => (v ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>),
    },
    {
      title: "Last Sign-in",
      dataIndex: "last_signed_in_at",
      width: 160,
      render: formatDateTime,
    },
    {
      title: "Added By",
      dataIndex: "added_by",
      width: 220,
      render: (v: string | null) => v ?? "-",
    },
    {
      title: "Created",
      dataIndex: "created_at",
      width: 160,
      render: formatDateTime,
    },
    {
      title: "",
      key: "actions",
      width: 110,
      render: (_: unknown, record: Admin) => {
        const isSelf = me?.id === record.id;
        return (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
            {isSelf ? (
              <Tooltip title="Cannot delete yourself">
                <Button size="small" danger icon={<DeleteOutlined />} disabled />
              </Tooltip>
            ) : (
              <Popconfirm
                title={`Delete ${record.email}?`}
                onConfirm={() => deleteMutation.mutate(record.id)}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  const isEditingSelf = !!editing && me?.id === editing.id;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Admins
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          New admin
        </Button>
      </div>

      {data?.bootstrap_email && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              Bootstrap admin: <strong>{data.bootstrap_email}</strong> — always granted
              super_admin regardless of this list (lockout safety).
            </span>
          }
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search by email or name"
          allowClear
          onSearch={(v) => {
            setSearch(v);
            resetPage();
          }}
          style={{ width: 300 }}
        />
        <Select
          placeholder="Role"
          allowClear
          options={ROLE_OPTIONS}
          value={role}
          onChange={(v) => {
            setRole(v);
            resetPage();
          }}
          style={{ width: 160 }}
        />
        <Select
          placeholder="Status"
          allowClear
          options={ACTIVE_OPTIONS}
          value={activeFilter}
          onChange={(v) => {
            setActiveFilter(v);
            resetPage();
          }}
          style={{ width: 140 }}
        />
      </Space>

      <Table<Admin>
        dataSource={data?.admins}
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
        onChange={(p) =>
          setPagination({ current: p.current ?? 1, pageSize: p.pageSize ?? 50 })
        }
        size="middle"
      />

      <Modal
        title={editing ? `Edit admin #${editing.id}` : "New admin"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editing ? "Save" : "Create"}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={initialValues}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input disabled={!!editing} placeholder="someone@example.com" />
          </Form.Item>
          <Form.Item label="Name" name="name">
            <Input placeholder="(optional)" />
          </Form.Item>
          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true }]}
            extra={isEditingSelf ? "You cannot change your own role" : undefined}
          >
            <Select options={ROLE_OPTIONS} disabled={isEditingSelf} />
          </Form.Item>
          <Form.Item
            label="Active"
            name="is_active"
            valuePropName="checked"
            extra={isEditingSelf ? "You cannot deactivate yourself" : undefined}
          >
            <Switch disabled={isEditingSelf} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

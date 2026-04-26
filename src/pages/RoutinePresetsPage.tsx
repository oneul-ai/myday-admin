import { useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  createRoutinePreset,
  deleteRoutinePreset,
  getRoutinePresets,
  updateRoutinePreset,
  type RoutinePreset,
  type RoutinePresetInput,
} from "../api/routinePresets";

const TIME_SLOT_OPTIONS = [
  { value: "ANYTIME", label: "Anytime" },
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "EVENING", label: "Evening" },
  { value: "SPECIFIC", label: "Specific" },
];

const TIME_SLOT_COLORS: Record<string, string> = {
  ANYTIME: "default",
  MORNING: "gold",
  AFTERNOON: "orange",
  EVENING: "purple",
  SPECIFIC: "cyan",
};

const ACTIVE_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const LOCALE_LABELS: Record<string, string> = {
  ko: "한국어 (ko)",
  en: "English (en)",
  "zh-Hans": "简体中文 (zh-Hans)",
  "zh-Hant": "繁體中文 (zh-Hant)",
  ja: "日本語 (ja)",
};

const DEFAULT_LOCALES = ["ko", "en", "zh-Hans", "zh-Hant", "ja"];

interface FormValues {
  time_slot: string;
  emoji?: string;
  focus_minutes?: number | null;
  position?: number;
  is_active: boolean;
  titles: Record<string, string | undefined>;
}

export default function RoutinePresetsPage() {
  const queryClient = useQueryClient();
  const [timeSlot, setTimeSlot] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<string | undefined>();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoutinePreset | null>(null);
  const [form] = Form.useForm<FormValues>();

  const offset = (pagination.current - 1) * pagination.pageSize;

  const { data, isLoading } = useQuery({
    queryKey: ["routine-presets", { timeSlot, activeFilter, offset, limit: pagination.pageSize }],
    queryFn: () =>
      getRoutinePresets({
        time_slot: timeSlot,
        is_active: activeFilter === undefined ? undefined : activeFilter === "true",
        offset,
        limit: pagination.pageSize,
      }),
  });

  const supportedLocales = data?.supported_locales ?? DEFAULT_LOCALES;

  const createMutation = useMutation({
    mutationFn: createRoutinePreset,
    onSuccess: () => {
      message.success("Created");
      queryClient.invalidateQueries({ queryKey: ["routine-presets"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Create failed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<RoutinePresetInput> }) =>
      updateRoutinePreset(id, body),
    onSuccess: () => {
      message.success("Updated");
      queryClient.invalidateQueries({ queryKey: ["routine-presets"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Update failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoutinePreset,
    onSuccess: () => {
      message.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["routine-presets"] });
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

  const openEditModal = (p: RoutinePreset) => {
    setEditing(p);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const initialValues = editing
    ? {
        time_slot: editing.time_slot,
        emoji: editing.emoji ?? undefined,
        focus_minutes: editing.focus_minutes ?? undefined,
        position: editing.position,
        is_active: editing.is_active,
        titles: editing.titles,
      }
    : {
        time_slot: "ANYTIME",
        position: 0,
        is_active: true,
        titles: {},
      };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const titles: Record<string, string> = {};
    for (const [locale, value] of Object.entries(values.titles ?? {})) {
      const trimmed = value?.trim();
      if (trimmed) titles[locale] = trimmed;
    }
    if (!titles.ko) {
      message.error("Korean (ko) title is required");
      return;
    }
    const body: RoutinePresetInput = {
      time_slot: values.time_slot,
      emoji: values.emoji?.trim() || null,
      focus_minutes: values.focus_minutes ?? null,
      position: values.position ?? 0,
      is_active: values.is_active,
      titles,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const resetPage = () => setPagination((p) => ({ ...p, current: 1 }));
  const formatDateTime = (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-");

  const columns = [
    {
      title: "Time Slot",
      dataIndex: "time_slot",
      width: 130,
      render: (v: string) => <Tag color={TIME_SLOT_COLORS[v] ?? "default"}>{v}</Tag>,
    },
    {
      title: "Emoji",
      dataIndex: "emoji",
      width: 80,
      render: (v: string | null) => v ?? "-",
    },
    {
      title: "Title (ko)",
      dataIndex: "titles",
      width: 220,
      render: (titles: Record<string, string>) => titles?.ko ?? "-",
    },
    {
      title: "Locales",
      dataIndex: "titles",
      width: 240,
      render: (titles: Record<string, string>) => (
        <Space size={4} wrap>
          {Object.keys(titles ?? {}).map((l) => (
            <Tag key={l}>{l}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Focus Min",
      dataIndex: "focus_minutes",
      width: 100,
      render: (v: number | null) => v ?? "-",
    },
    {
      title: "Position",
      dataIndex: "position",
      width: 90,
    },
    {
      title: "Active",
      dataIndex: "is_active",
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>),
    },
    {
      title: "Updated",
      dataIndex: "updated_at",
      width: 150,
      render: formatDateTime,
    },
    {
      title: "",
      key: "actions",
      width: 110,
      render: (_: unknown, record: RoutinePreset) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Popconfirm
            title="Delete this preset?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Routine Presets
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          New preset
        </Button>
      </div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Time slot"
          allowClear
          options={TIME_SLOT_OPTIONS}
          value={timeSlot}
          onChange={(v) => {
            setTimeSlot(v);
            resetPage();
          }}
          style={{ width: 180 }}
        />
        <Select
          placeholder="Active"
          allowClear
          options={ACTIVE_OPTIONS}
          value={activeFilter}
          onChange={(v) => {
            setActiveFilter(v);
            resetPage();
          }}
          style={{ width: 150 }}
        />
      </Space>
      <Table<RoutinePreset>
        dataSource={data?.presets}
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
        scroll={{ x: 1300 }}
      />

      <Modal
        title={editing ? `Edit preset #${editing.id}` : "New preset"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editing ? "Save" : "Create"}
        width={620}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={initialValues}>
          <Form.Item label="Time slot" name="time_slot" rules={[{ required: true }]}>
            <Select options={TIME_SLOT_OPTIONS} />
          </Form.Item>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Form.Item label="Emoji" name="emoji" style={{ flex: "0 0 100px" }}>
              <Input maxLength={10} />
            </Form.Item>
            <Form.Item label="Focus min" name="focus_minutes" style={{ flex: "0 0 120px" }}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Position" name="position" style={{ flex: "0 0 120px" }}>
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Active" name="is_active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <Typography.Title level={5} style={{ marginTop: 8 }}>
            Titles
          </Typography.Title>
          {supportedLocales.map((locale) => (
            <Form.Item
              key={locale}
              label={LOCALE_LABELS[locale] ?? locale}
              name={["titles", locale]}
              rules={
                locale === "ko"
                  ? [{ required: true, message: "Korean title is required" }]
                  : undefined
              }
            >
              <Input />
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </>
  );
}

import { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeleteOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createRestPreferenceOption,
  deleteRestPreferenceOption,
  getRestPreferenceOptions,
  reorderRestPreferenceOptions,
  updateRestPreferenceOption,
  type RestPreferenceOption,
  type RestPreferenceOptionUpdateInput,
} from "../api/restPreferenceOptions";

const FILTER_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
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
  key: string;
  is_active: boolean;
  titles: Record<string, string | undefined>;
}

function SortableRow({
  option,
  onClick,
}: {
  option: RestPreferenceOption;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : option.is_active ? 1 : 0.55,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        padding: "10px 12px",
        background: "#fff",
        borderBottom: "1px solid #f0f0f0",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <span
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        style={{
          cursor: "grab",
          color: "#bbb",
          marginRight: 12,
          padding: 4,
          touchAction: "none",
        }}
        aria-label="Drag to reorder"
      >
        <HolderOutlined />
      </span>
      <span style={{ flex: 1 }}>
        <span>{option.titles?.ko ?? "(no ko title)"}</span>
        <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
          {option.key}
        </Typography.Text>
        {!option.is_active && <Tag style={{ marginLeft: 8 }}>Inactive</Tag>}
      </span>
    </div>
  );
}

export default function RestPreferenceOptionsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RestPreferenceOption | null>(null);
  const [form] = Form.useForm<FormValues>();

  const queryKey = ["rest-preference-options", { filter }] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getRestPreferenceOptions({
        is_active: filter === "active",
        limit: 200,
      }),
  });

  const supportedLocales = data?.supported_locales ?? DEFAULT_LOCALES;
  const options = data?.options ?? [];

  const reorderMutation = useMutation({
    mutationFn: (ordered_ids: number[]) => reorderRestPreferenceOptions(ordered_ids),
    onMutate: async (ordered_ids) => {
      await queryClient.cancelQueries({ queryKey: ["rest-preference-options"] });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: typeof data) => {
        if (!old) return old;
        const idToPosition = new Map(ordered_ids.map((id, idx) => [id, idx]));
        const updated = old.options.map((o) =>
          idToPosition.has(o.id) ? { ...o, position: idToPosition.get(o.id)! } : o,
        );
        updated.sort((a, b) => a.position - b.position);
        return { ...old, options: updated };
      });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Reorder failed");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["rest-preference-options"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: createRestPreferenceOption,
    onSuccess: () => {
      message.success("Created");
      queryClient.invalidateQueries({ queryKey: ["rest-preference-options"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Create failed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: RestPreferenceOptionUpdateInput }) =>
      updateRestPreferenceOption(id, body),
    onSuccess: () => {
      message.success("Updated");
      queryClient.invalidateQueries({ queryKey: ["rest-preference-options"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Update failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRestPreferenceOption,
    onSuccess: () => {
      message.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["rest-preference-options"] });
      closeModal();
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

  const openDetailModal = (o: RestPreferenceOption) => {
    setEditing(o);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const initialValues: FormValues = editing
    ? {
        key: editing.key,
        is_active: editing.is_active,
        titles: editing.titles,
      }
    : {
        key: "",
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
    const key = values.key.trim();
    if (!key) {
      message.error("Key is required");
      return;
    }
    if (editing) {
      const body: RestPreferenceOptionUpdateInput = {
        titles,
        is_active: values.is_active,
      };
      if (key !== editing.key) body.key = key;
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate({ key, titles, is_active: values.is_active });
    }
  };

  const handleDelete = () => {
    if (editing) deleteMutation.mutate(editing.id);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(options, oldIndex, newIndex);
    reorderMutation.mutate(next.map((o) => o.id));
  };

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
          Rest Preference Options
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          New option
        </Button>
      </div>

      <Segmented
        options={FILTER_OPTIONS}
        value={filter}
        onChange={(v) => setFilter(String(v))}
        style={{ marginBottom: 16 }}
      />

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 32, color: "#999" }}>Loading…</div>
      ) : (
        <Card
          size="small"
          title={
            <Typography.Text type="secondary">{options.length} items</Typography.Text>
          }
          styles={{ body: { padding: 0 } }}
        >
          {options.length === 0 ? (
            <div style={{ padding: 16, color: "#999", textAlign: "center" }}>No options</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={options.map((o) => o.id)}
                strategy={verticalListSortingStrategy}
              >
                {options.map((o) => (
                  <SortableRow key={o.id} option={o} onClick={() => openDetailModal(o)} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </Card>
      )}

      <Modal
        title={editing ? `Option #${editing.id}` : "New option"}
        open={modalOpen}
        onCancel={closeModal}
        width={620}
        destroyOnClose
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              {editing && (
                <Popconfirm
                  title="Delete this option?"
                  description="기존 사용자 데이터의 해당 key는 표시에서 제외됩니다."
                  onConfirm={handleDelete}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>
                    Delete
                  </Button>
                </Popconfirm>
              )}
            </span>
            <Space>
              <Button onClick={closeModal}>Cancel</Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? "Save" : "Create"}
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={initialValues}>
          <Form.Item
            label="Key"
            name="key"
            rules={[
              { required: true, message: "Key is required" },
              {
                pattern: /^[a-z][a-z0-9_]*$/,
                message: "lowercase letters/digits/underscore, starts with a letter",
              },
            ]}
            extra="저장된 user_preferences.rest_preferences 의 식별자. 변경 시 기존 값과의 호환성에 주의."
          >
            <Input placeholder="예: exercise" />
          </Form.Item>

          <Form.Item
            label="한국어 (ko)"
            name={["titles", "ko"]}
            rules={[{ required: true, message: "Korean title is required" }]}
          >
            <Input placeholder="예: 운동" />
          </Form.Item>

          <Form.Item label="Active" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Typography.Title level={5} style={{ marginTop: 8 }}>
            Other titles
          </Typography.Title>
          {supportedLocales
            .filter((locale) => locale !== "ko")
            .map((locale) => (
              <Form.Item
                key={locale}
                label={LOCALE_LABELS[locale] ?? locale}
                name={["titles", locale]}
              >
                <Input />
              </Form.Item>
            ))}
        </Form>
      </Modal>
    </>
  );
}

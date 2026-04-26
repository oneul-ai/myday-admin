import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
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
  autofillRoutinePreset,
  createRoutinePreset,
  deleteRoutinePreset,
  getRoutinePresets,
  reorderRoutinePresets,
  updateRoutinePreset,
  type RoutinePreset,
  type RoutinePresetUpdateInput,
} from "../api/routinePresets";

const TIME_SLOT_ORDER = ["MORNING", "AFTERNOON", "EVENING", "ANYTIME", "SPECIFIC"] as const;

const TIME_SLOT_LABELS: Record<string, string> = {
  ANYTIME: "Anytime",
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
  SPECIFIC: "Specific",
};

const TIME_SLOT_COLORS: Record<string, string> = {
  ANYTIME: "default",
  MORNING: "gold",
  AFTERNOON: "orange",
  EVENING: "purple",
  SPECIFIC: "cyan",
};

const TIME_SLOT_OPTIONS = TIME_SLOT_ORDER.map((v) => ({
  value: v,
  label: TIME_SLOT_LABELS[v],
}));

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
  time_slot: string;
  emoji?: string;
  focus_minutes?: number | null;
  is_active: boolean;
  titles: Record<string, string | undefined>;
}

function SortableRow({ preset, onClick }: { preset: RoutinePreset; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: preset.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : preset.is_active ? 1 : 0.55,
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
        {preset.emoji && <span style={{ marginRight: 6 }}>{preset.emoji}</span>}
        <span>{preset.titles?.ko ?? "(no ko title)"}</span>
        {preset.focus_minutes != null && (
          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
            ({preset.focus_minutes}min)
          </Typography.Text>
        )}
        {!preset.is_active && <Tag style={{ marginLeft: 8 }}>Inactive</Tag>}
      </span>
    </div>
  );
}

function TimeSlotSection({
  timeSlot,
  presets,
  onReorder,
  onRowClick,
}: {
  timeSlot: string;
  presets: RoutinePreset[];
  onReorder: (timeSlot: string, ordered: number[]) => void;
  onRowClick: (preset: RoutinePreset) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = presets.findIndex((p) => p.id === active.id);
    const newIndex = presets.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(presets, oldIndex, newIndex);
    onReorder(
      timeSlot,
      next.map((p) => p.id),
    );
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <Tag color={TIME_SLOT_COLORS[timeSlot] ?? "default"}>{timeSlot}</Tag>
          <Typography.Text type="secondary">{presets.length} items</Typography.Text>
        </Space>
      }
      styles={{ body: { padding: 0 } }}
    >
      {presets.length === 0 ? (
        <div style={{ padding: 16, color: "#999", textAlign: "center" }}>No presets</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={presets.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {presets.map((p) => (
              <SortableRow key={p.id} preset={p} onClick={() => onRowClick(p)} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </Card>
  );
}

export default function RoutinePresetsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoutinePreset | null>(null);
  const [form] = Form.useForm<FormValues>();

  const queryKey = ["routine-presets", { filter }] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getRoutinePresets({
        is_active: filter === "active",
        limit: 200,
      }),
  });

  const supportedLocales = data?.supported_locales ?? DEFAULT_LOCALES;

  const grouped = useMemo(() => {
    const map: Record<string, RoutinePreset[]> = {};
    for (const ts of TIME_SLOT_ORDER) map[ts] = [];
    for (const p of data?.presets ?? []) {
      if (!map[p.time_slot]) map[p.time_slot] = [];
      map[p.time_slot].push(p);
    }
    return map;
  }, [data]);

  const reorderMutation = useMutation({
    mutationFn: ({ time_slot, ordered_ids }: { time_slot: string; ordered_ids: number[] }) =>
      reorderRoutinePresets(time_slot, ordered_ids),
    onMutate: async ({ time_slot, ordered_ids }) => {
      await queryClient.cancelQueries({ queryKey: ["routine-presets"] });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: typeof data) => {
        if (!old) return old;
        const idToPosition = new Map(ordered_ids.map((id, idx) => [id, idx]));
        const updated = old.presets.map((p) => {
          if (p.time_slot === time_slot && idToPosition.has(p.id)) {
            return { ...p, position: idToPosition.get(p.id)! };
          }
          return p;
        });
        updated.sort((a, b) => {
          if (a.time_slot !== b.time_slot) return 0;
          return a.position - b.position;
        });
        return { ...old, presets: updated };
      });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Reorder failed");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["routine-presets"] });
    },
  });

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
    mutationFn: ({ id, body }: { id: number; body: RoutinePresetUpdateInput }) =>
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
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Delete failed");
    },
  });

  const autofillMutation = useMutation({
    mutationFn: ({ ko_title, time_slot }: { ko_title: string; time_slot?: string }) =>
      autofillRoutinePreset(ko_title, time_slot),
    onSuccess: (data) => {
      const currentTitles = (form.getFieldValue("titles") as Record<string, string>) ?? {};
      form.setFieldsValue({
        emoji: data.emoji ?? undefined,
        focus_minutes: data.focus_minutes ?? undefined,
        titles: { ...currentTitles, ...data.titles },
      });
      message.success("Auto-filled");
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Autofill failed");
    },
  });

  const handleAutofill = () => {
    const ko = form.getFieldValue(["titles", "ko"]);
    const time_slot = form.getFieldValue("time_slot");
    if (!ko || !ko.trim()) {
      message.warning("Korean (ko) title is required to autofill");
      return;
    }
    autofillMutation.mutate({ ko_title: ko.trim(), time_slot });
  };

  const openCreateModal = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openDetailModal = (p: RoutinePreset) => {
    setEditing(p);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const initialValues: FormValues = editing
    ? {
        time_slot: editing.time_slot,
        emoji: editing.emoji ?? undefined,
        focus_minutes: editing.focus_minutes ?? undefined,
        is_active: editing.is_active,
        titles: editing.titles,
      }
    : {
        time_slot: "ANYTIME",
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
    const body = {
      time_slot: values.time_slot,
      emoji: values.emoji?.trim() || null,
      focus_minutes: values.focus_minutes ?? null,
      is_active: values.is_active,
      titles,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const handleDelete = () => {
    if (editing) deleteMutation.mutate(editing.id);
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
          Routine Presets
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          New preset
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
        <Row gutter={[16, 16]}>
          {TIME_SLOT_ORDER.map((ts) => (
            <Col key={ts} xs={24} md={12} xl={8}>
              <TimeSlotSection
                timeSlot={ts}
                presets={grouped[ts] ?? []}
                onReorder={(time_slot, ordered_ids) =>
                  reorderMutation.mutate({ time_slot, ordered_ids })
                }
                onRowClick={openDetailModal}
              />
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={editing ? `Preset #${editing.id}` : "New preset"}
        open={modalOpen}
        onCancel={closeModal}
        width={620}
        destroyOnClose
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              {editing && (
                <Popconfirm
                  title="Delete this preset?"
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
          <Form.Item label="Time slot" name="time_slot" rules={[{ required: true }]}>
            <Select options={TIME_SLOT_OPTIONS} />
          </Form.Item>

          <Form.Item
            label="한국어 (ko)"
            name={["titles", "ko"]}
            rules={[{ required: true, message: "Korean title is required" }]}
            extra={
              <Button
                type="link"
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={handleAutofill}
                loading={autofillMutation.isPending}
                style={{ paddingLeft: 0 }}
              >
                Auto-fill emoji, focus min, and other languages
              </Button>
            }
          >
            <Input placeholder="예: 침대 정리하기" />
          </Form.Item>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Form.Item label="Emoji" name="emoji" style={{ flex: "0 0 100px" }}>
              <Input maxLength={10} />
            </Form.Item>
            <Form.Item label="Focus min" name="focus_minutes" style={{ flex: "0 0 120px" }}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Active" name="is_active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

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

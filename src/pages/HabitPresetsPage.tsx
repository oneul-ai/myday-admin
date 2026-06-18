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
  autofillHabitPreset,
  createHabitPreset,
  deleteHabitPreset,
  getHabitPresets,
  reorderHabitPresets,
  updateHabitPreset,
  type HabitPreset,
  type HabitPresetUpdateInput,
} from "../api/habitPresets";

const TIME_SLOT_ORDER = ["MORNING", "AFTERNOON", "EVENING", "ANYTIME"] as const;

const TIME_SLOT_LABELS: Record<string, string> = {
  ANYTIME: "Anytime",
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

const TIME_SLOT_COLORS: Record<string, string> = {
  ANYTIME: "default",
  MORNING: "gold",
  AFTERNOON: "orange",
  EVENING: "purple",
};

const TIME_SLOT_OPTIONS = TIME_SLOT_ORDER.map((v) => ({
  value: v,
  label: TIME_SLOT_LABELS[v],
}));

const FILTER_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const JOB_TYPE_LABELS: Record<string, string> = {
  office_worker: "회사원",
  student: "학생",
  freelancer: "프리랜서",
  business_owner: "사업가",
  shift_worker: "교대근무자",
  homemaker: "육아/가사",
  job_seeker: "시험/취업 준비",
};

// `null` 센티넬 = 공통 풀 (job_type IS NULL).
const JOB_TYPE_FILTER_VALUE_ALL = "all";
const JOB_TYPE_FILTER_VALUE_COMMON = "null";

const LOCALE_LABELS: Record<string, string> = {
  ko: "한국어 (ko)",
  en: "English (en)",
  "zh-Hans": "简体中文 (zh-Hans)",
  "zh-Hant": "繁體中文 (zh-Hant)",
  ja: "日本語 (ja)",
};

const DEFAULT_LOCALES = ["ko", "en", "zh-Hans", "zh-Hant", "ja"];

interface FormValues {
  job_type: string; // "__null__" 센티넬 = 공통
  time_slot: string;
  emoji?: string;
  focus_seconds?: number | null;
  is_active: boolean;
  titles: Record<string, string | undefined>;
}

function jobTypeTag(jobType: string | null) {
  if (jobType == null) {
    return <Tag color="default">공통</Tag>;
  }
  return <Tag color="blue">{JOB_TYPE_LABELS[jobType] ?? jobType}</Tag>;
}

function SortableRow({
  preset,
  draggable,
  showJobTag,
  onClick,
}: {
  preset: HabitPreset;
  draggable: boolean;
  showJobTag: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: preset.id,
    disabled: !draggable,
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
      {draggable ? (
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
      ) : (
        <span style={{ marginRight: 12, padding: 4 }} />
      )}
      <span style={{ flex: 1 }}>
        {preset.emoji && <span style={{ marginRight: 6 }}>{preset.emoji}</span>}
        <span>{preset.titles?.ko ?? "(no ko title)"}</span>
        {preset.focus_seconds != null && (
          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
            ({preset.focus_seconds}sec)
          </Typography.Text>
        )}
        {showJobTag && <span style={{ marginLeft: 8 }}>{jobTypeTag(preset.job_type)}</span>}
        {!preset.is_active && <Tag style={{ marginLeft: 8 }}>Inactive</Tag>}
      </span>
    </div>
  );
}

function TimeSlotSection({
  timeSlot,
  presets,
  reorderEnabled,
  showJobTag,
  onReorder,
  onRowClick,
}: {
  timeSlot: string;
  presets: HabitPreset[];
  reorderEnabled: boolean;
  showJobTag: boolean;
  onReorder: (timeSlot: string, ordered: number[]) => void;
  onRowClick: (preset: HabitPreset) => void;
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
              <SortableRow
                key={p.id}
                preset={p}
                draggable={reorderEnabled}
                showJobTag={showJobTag}
                onClick={() => onRowClick(p)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </Card>
  );
}

export default function HabitPresetsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("active");
  const [jobFilter, setJobFilter] = useState<string>(JOB_TYPE_FILTER_VALUE_ALL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HabitPreset | null>(null);
  const [form] = Form.useForm<FormValues>();

  // reorder 는 단일 (job_type, time_slot) 그룹 안에서만 의미가 있으므로
  // 특정 job(또는 공통)으로 좁혀졌을 때만 드래그 정렬을 허용한다.
  const reorderEnabled = jobFilter !== JOB_TYPE_FILTER_VALUE_ALL;
  const showJobTag = jobFilter === JOB_TYPE_FILTER_VALUE_ALL;

  const queryKey = ["habit-presets", { filter, jobFilter }] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getHabitPresets({
        job_type: jobFilter === JOB_TYPE_FILTER_VALUE_ALL ? undefined : jobFilter,
        is_active: filter === "active",
        limit: 200,
      }),
  });

  const supportedLocales = data?.supported_locales ?? DEFAULT_LOCALES;
  const validJobTypes = data?.valid_job_types ?? Object.keys(JOB_TYPE_LABELS);

  const grouped = useMemo(() => {
    const map: Record<string, HabitPreset[]> = {};
    for (const ts of TIME_SLOT_ORDER) map[ts] = [];
    for (const p of data?.presets ?? []) {
      if (!map[p.time_slot]) map[p.time_slot] = [];
      map[p.time_slot].push(p);
    }
    return map;
  }, [data]);

  const jobTypeFilterOptions = useMemo(
    () => [
      { value: JOB_TYPE_FILTER_VALUE_ALL, label: "All jobs" },
      { value: JOB_TYPE_FILTER_VALUE_COMMON, label: "공통 (NULL)" },
      ...validJobTypes.map((v) => ({ value: v, label: JOB_TYPE_LABELS[v] ?? v })),
    ],
    [validJobTypes],
  );

  const jobTypeFormOptions = useMemo(
    () => [
      { value: "__null__", label: "공통 (NULL)" },
      ...validJobTypes.map((v) => ({ value: v, label: JOB_TYPE_LABELS[v] ?? v })),
    ],
    [validJobTypes],
  );

  const reorderMutation = useMutation({
    mutationFn: ({
      job_type,
      time_slot,
      ordered_ids,
    }: {
      job_type: string | null;
      time_slot: string;
      ordered_ids: number[];
    }) => reorderHabitPresets(job_type, time_slot, ordered_ids),
    onMutate: async ({ time_slot, ordered_ids }) => {
      await queryClient.cancelQueries({ queryKey: ["habit-presets"] });
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
      queryClient.invalidateQueries({ queryKey: ["habit-presets"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: createHabitPreset,
    onSuccess: () => {
      message.success("Created");
      queryClient.invalidateQueries({ queryKey: ["habit-presets"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Create failed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: HabitPresetUpdateInput }) =>
      updateHabitPreset(id, body),
    onSuccess: () => {
      message.success("Updated");
      queryClient.invalidateQueries({ queryKey: ["habit-presets"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Update failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHabitPreset,
    onSuccess: () => {
      message.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["habit-presets"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "Delete failed");
    },
  });

  const autofillMutation = useMutation({
    mutationFn: ({ ko_title, time_slot }: { ko_title: string; time_slot?: string }) =>
      autofillHabitPreset(ko_title, time_slot),
    onSuccess: (data) => {
      const currentTitles = (form.getFieldValue("titles") as Record<string, string>) ?? {};
      form.setFieldsValue({
        emoji: data.emoji ?? undefined,
        focus_seconds: data.focus_seconds ?? undefined,
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

  const openDetailModal = (p: HabitPreset) => {
    setEditing(p);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  // 생성 시 현재 job 필터를 기본 job_type 으로 미리 채운다 (All jobs → 공통).
  const defaultJobType =
    jobFilter === JOB_TYPE_FILTER_VALUE_ALL
      ? "__null__"
      : jobFilter === JOB_TYPE_FILTER_VALUE_COMMON
        ? "__null__"
        : jobFilter;

  // Form Select 는 null 을 직접 다루기 까다로워 "__null__" 센티넬로 표현한다.
  const initialValues: FormValues = editing
    ? {
        job_type: editing.job_type ?? "__null__",
        time_slot: editing.time_slot,
        emoji: editing.emoji ?? undefined,
        focus_seconds: editing.focus_seconds ?? undefined,
        is_active: editing.is_active,
        titles: editing.titles,
      }
    : {
        job_type: defaultJobType,
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
      job_type: values.job_type === "__null__" ? null : values.job_type,
      time_slot: values.time_slot,
      emoji: values.emoji?.trim() || null,
      focus_seconds: values.focus_seconds ?? null,
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
          Habit Presets
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          New preset
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          value={jobFilter}
          onChange={setJobFilter}
          options={jobTypeFilterOptions}
          style={{ width: 200 }}
        />
        <Segmented options={FILTER_OPTIONS} value={filter} onChange={(v) => setFilter(String(v))} />
        {!reorderEnabled && (
          <Typography.Text type="secondary">
            드래그 정렬은 특정 직업/공통으로 필터하면 사용할 수 있어요
          </Typography.Text>
        )}
      </Space>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 32, color: "#999" }}>Loading…</div>
      ) : (
        <Row gutter={[16, 16]}>
          {TIME_SLOT_ORDER.map((ts) => (
            <Col key={ts} xs={24} md={12} xl={8}>
              <TimeSlotSection
                timeSlot={ts}
                presets={grouped[ts] ?? []}
                reorderEnabled={reorderEnabled}
                showJobTag={showJobTag}
                onReorder={(time_slot, ordered_ids) =>
                  reorderMutation.mutate({
                    job_type:
                      jobFilter === JOB_TYPE_FILTER_VALUE_COMMON ? null : jobFilter,
                    time_slot,
                    ordered_ids,
                  })
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
          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item
              label="Job type"
              name="job_type"
              style={{ flex: 1 }}
              rules={[{ required: true }]}
              extra="공통 = 모든 직업 유저에게 노출"
            >
              <Select options={jobTypeFormOptions} />
            </Form.Item>
            <Form.Item
              label="Time slot"
              name="time_slot"
              style={{ flex: 1 }}
              rules={[{ required: true }]}
            >
              <Select options={TIME_SLOT_OPTIONS} />
            </Form.Item>
          </div>

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
                Auto-fill emoji, focus sec, and other languages
              </Button>
            }
          >
            <Input placeholder="예: 침대 정리하기" />
          </Form.Item>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Form.Item label="Emoji" name="emoji" style={{ flex: "0 0 100px" }}>
              <Input maxLength={10} />
            </Form.Item>
            <Form.Item label="Focus sec" name="focus_seconds" style={{ flex: "0 0 120px" }}>
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

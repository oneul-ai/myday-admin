import { useEffect, useMemo, useState } from "react";
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
  CheckCircleOutlined,
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
  StopOutlined,
  ThunderboltOutlined,
  UserOutlined,
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
  homemaker: "육아/가사",
  job_seeker: "시험/취업 준비",
};

// `null` 센티넬 = 공통 풀 (job_type IS NULL).
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

// focus_seconds 는 초 단위로 저장하지만, 리스트 표시는 가독성을 위해 단위를 환산한다.
// 60초 미만은 초, 60초~60분 미만은 분, 60분 이상은 시간 단위로 보여준다.
function formatFocusDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}sec`;
  if (seconds < 3600) {
    const min = seconds / 60;
    return `${Number.isInteger(min) ? min : min.toFixed(1)}min`;
  }
  const hour = seconds / 3600;
  return `${Number.isInteger(hour) ? hour : hour.toFixed(1)}hr`;
}

// 이 습관을 등록한 유저 수 — 서버가 Task.habit_preset_id 로 집계해 내려준다.
function UserCountBadge({ count }: { count?: number }) {
  return (
    <Typography.Text
      type="secondary"
      style={{ marginLeft: 8, whiteSpace: "nowrap", fontSize: 12 }}
      title="이 습관을 등록한 유저 수"
    >
      <UserOutlined style={{ marginRight: 4 }} />
      {count ?? 0}명
    </Typography.Text>
  );
}

function SortableRow({ preset, onClick }: { preset: HabitPreset; onClick: () => void }) {
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
        {preset.focus_seconds != null && (
          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
            ({formatFocusDuration(preset.focus_seconds)})
          </Typography.Text>
        )}
        {!preset.is_active && <Tag style={{ marginLeft: 8 }}>Inactive</Tag>}
      </span>
      <UserCountBadge count={preset.user_count} />
    </div>
  );
}

// 공통 풀 행 — job_type 필터에 토글로 함께 보여주는 읽기 전용 컨텍스트.
// 정렬은 (job_type, time_slot) 그룹 단위라 다른 그룹인 공통 행은 드래그 불가.
function CommonRow({ preset, onClick }: { preset: HabitPreset; onClick: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 12px",
        background: "#fafafa",
        borderBottom: "1px solid #f0f0f0",
        cursor: "pointer",
        opacity: preset.is_active ? 0.85 : 0.5,
      }}
      onClick={onClick}
    >
      {/* SortableRow 의 드래그 핸들 자리에 맞춰 정렬 */}
      <span style={{ width: 16, marginRight: 12 }} />
      <span style={{ flex: 1 }}>
        {preset.emoji && <span style={{ marginRight: 6 }}>{preset.emoji}</span>}
        <span>{preset.titles?.ko ?? "(no ko title)"}</span>
        {preset.focus_seconds != null && (
          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
            ({formatFocusDuration(preset.focus_seconds)})
          </Typography.Text>
        )}
        <Tag color="blue" style={{ marginLeft: 8 }}>
          공통
        </Tag>
        {!preset.is_active && <Tag style={{ marginLeft: 8 }}>Inactive</Tag>}
      </span>
      <UserCountBadge count={preset.user_count} />
    </div>
  );
}

function TimeSlotSection({
  timeSlot,
  presets,
  commonPresets,
  onReorder,
  onRowClick,
  onAdd,
}: {
  timeSlot: string;
  presets: HabitPreset[];
  commonPresets: HabitPreset[];
  onReorder: (timeSlot: string, ordered: number[]) => void;
  onRowClick: (preset: HabitPreset) => void;
  onAdd: (timeSlot: string) => void;
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
          <Typography.Text type="secondary">
            {presets.length} items
            {commonPresets.length > 0 ? ` (+${commonPresets.length} 공통)` : ""}
          </Typography.Text>
        </Space>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => onAdd(timeSlot)}
          aria-label={`Add preset to ${timeSlot}`}
        />
      }
      styles={{ body: { padding: 0 } }}
    >
      {presets.length === 0 && commonPresets.length === 0 ? (
        <div style={{ padding: 16, color: "#999", textAlign: "center" }}>No presets</div>
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={presets.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {presets.map((p) => (
                <SortableRow key={p.id} preset={p} onClick={() => onRowClick(p)} />
              ))}
            </SortableContext>
          </DndContext>
          {commonPresets.map((p) => (
            <CommonRow key={p.id} preset={p} onClick={() => onRowClick(p)} />
          ))}
        </>
      )}
    </Card>
  );
}

export default function HabitPresetsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("active");
  const [jobFilter, setJobFilter] = useState<string>(JOB_TYPE_FILTER_VALUE_COMMON);
  // 특정 job_type 선택 시 공통 풀을 함께 보여주는 토글 (기본 OFF).
  const [showCommon, setShowCommon] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // 섹션의 + 버튼으로 생성할 때 미리 채워질 time_slot.
  const [createTimeSlot, setCreateTimeSlot] = useState<string>("ANYTIME");
  const [editing, setEditing] = useState<HabitPreset | null>(null);
  const [bulkAutofilling, setBulkAutofilling] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const queryKey = ["habit-presets", { filter, jobFilter }] as const;

  // 필터는 항상 단일 (job_type | 공통) 그룹을 가리키므로 그 그룹의 항목만 조회한다.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getHabitPresets({
        job_type: jobFilter,
        is_active: filter === "active",
        limit: 200,
      }),
  });

  // 공통 풀은 특정 job_type 을 선택했고 토글이 켜졌을 때만 추가로 조회한다.
  const showCommonEffective = showCommon && jobFilter !== JOB_TYPE_FILTER_VALUE_COMMON;

  // queryKey 를 공통 필터 뷰와 동일하게 맞춰 캐시를 공유한다.
  const { data: commonData } = useQuery({
    queryKey: ["habit-presets", { filter, jobFilter: JOB_TYPE_FILTER_VALUE_COMMON }] as const,
    queryFn: () =>
      getHabitPresets({
        job_type: JOB_TYPE_FILTER_VALUE_COMMON,
        is_active: filter === "active",
        limit: 200,
      }),
    enabled: showCommonEffective,
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

  const groupedCommon = useMemo(() => {
    const map: Record<string, HabitPreset[]> = {};
    for (const ts of TIME_SLOT_ORDER) map[ts] = [];
    if (!showCommonEffective) return map;
    for (const p of commonData?.presets ?? []) {
      if (!map[p.time_slot]) map[p.time_slot] = [];
      map[p.time_slot].push(p);
    }
    return map;
  }, [commonData, showCommonEffective]);

  const jobTypeFilterOptions = useMemo(
    () => [
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

  // 현재 화면(필터)의 preset 중 emoji·focus_seconds·번역 중 하나라도 비어있고,
  // ko 제목이 있어 autofill 가능한 항목들. (ko 가 없으면 자동 채우기 불가 → 제외)
  const incompletePresets = useMemo(
    () =>
      (data?.presets ?? []).filter((p) => {
        if (!p.titles?.ko?.trim()) return false;
        const missingEmoji = !p.emoji;
        const missingFocus = p.focus_seconds == null;
        const missingTitle = supportedLocales.some((loc) => !p.titles?.[loc]?.trim());
        return missingEmoji || missingFocus || missingTitle;
      }),
    [data, supportedLocales],
  );

  // 비어있는 항목들을 순차적으로 autofill 한 뒤, 기존 값은 보존하고 빈 필드만 채워 저장한다.
  const handleBulkAutofill = async () => {
    const targets = incompletePresets;
    if (targets.length === 0) {
      message.info("Auto-fill 할 빈 항목이 없습니다");
      return;
    }
    setBulkAutofilling(true);
    const key = "bulk-autofill";
    let updated = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      message.loading({
        content: `Auto-filling ${i + 1}/${targets.length}…`,
        key,
        duration: 0,
      });
      try {
        const result = await autofillHabitPreset(p.titles.ko.trim(), p.time_slot);
        const body: HabitPresetUpdateInput = {};
        if (!p.emoji && result.emoji) body.emoji = result.emoji;
        if (p.focus_seconds == null && result.focus_seconds != null) {
          body.focus_seconds = result.focus_seconds;
        }
        // 기존 번역은 유지하고 비어있는 로케일만 새 값으로 채운다.
        const mergedTitles: Record<string, string> = { ...p.titles };
        let titleAdded = false;
        for (const loc of supportedLocales) {
          const incoming = result.titles?.[loc]?.trim();
          if (incoming && !mergedTitles[loc]?.trim()) {
            mergedTitles[loc] = incoming;
            titleAdded = true;
          }
        }
        if (titleAdded) body.titles = mergedTitles;
        if (Object.keys(body).length > 0) {
          await updateHabitPreset(p.id, body);
          updated++;
        }
      } catch {
        failed++;
      }
    }
    setBulkAutofilling(false);
    await queryClient.invalidateQueries({ queryKey: ["habit-presets"] });
    const summary = `Auto-fill 완료: ${updated}건 업데이트${failed ? `, ${failed}건 실패` : ""}`;
    if (failed > 0) message.warning({ content: summary, key });
    else message.success({ content: summary, key });
  };

  const openCreateModal = (timeSlot: string = "ANYTIME") => {
    setEditing(null);
    setCreateTimeSlot(timeSlot);
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

  // 생성 시 현재 job 필터를 기본 job_type 으로 미리 채운다 (공통 → "__null__").
  const defaultJobType =
    jobFilter === JOB_TYPE_FILTER_VALUE_COMMON ? "__null__" : jobFilter;

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
        time_slot: createTimeSlot,
        is_active: true,
        titles: {},
      };

  // antd 의 initialValues 는 폼 최초 마운트 때만 적용되므로, 모달이 열릴 때마다
  // 최신 initialValues 로 명시적으로 리셋한다. (닫힘 애니메이션 타이밍에 의존하면
  // 직전 아이템 값이 폼에 남는 문제가 생긴다.)
  useEffect(() => {
    if (modalOpen) form.resetFields();
  }, [modalOpen, editing, form]);

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

  // 상세 폼에서 활성/비활성을 한 번에 토글 (폼 전체 저장 없이 is_active 만).
  const handleToggleActive = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: { is_active: !editing.is_active } });
    }
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
        <Space>
          <Popconfirm
            title="비어있는 항목 일괄 채우기"
            description={`${incompletePresets.length}개 항목의 빈 emoji · focus · 번역을 자동으로 채웁니다.`}
            onConfirm={handleBulkAutofill}
            okText="Auto-fill"
            okButtonProps={{ loading: bulkAutofilling }}
            disabled={bulkAutofilling || incompletePresets.length === 0}
          >
            <Button
              icon={<ThunderboltOutlined />}
              loading={bulkAutofilling}
              disabled={incompletePresets.length === 0}
            >
              Auto-fill empty ({incompletePresets.length})
            </Button>
          </Popconfirm>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal()}>
            New preset
          </Button>
        </Space>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          value={jobFilter}
          onChange={setJobFilter}
          options={jobTypeFilterOptions}
          style={{ width: 200 }}
        />
        <Segmented options={FILTER_OPTIONS} value={filter} onChange={(v) => setFilter(String(v))} />
        {jobFilter !== JOB_TYPE_FILTER_VALUE_COMMON && (
          <Space size={6}>
            <Switch checked={showCommon} onChange={setShowCommon} size="small" />
            <Typography.Text type="secondary">공통 함께 보기</Typography.Text>
          </Space>
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
                commonPresets={groupedCommon[ts] ?? []}
                onReorder={(time_slot, ordered_ids) =>
                  reorderMutation.mutate({
                    job_type:
                      jobFilter === JOB_TYPE_FILTER_VALUE_COMMON ? null : jobFilter,
                    time_slot,
                    ordered_ids,
                  })
                }
                onRowClick={openDetailModal}
                onAdd={openCreateModal}
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
        destroyOnHidden
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space>
              {editing && (
                <>
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
                  <Button
                    icon={editing.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                    onClick={handleToggleActive}
                    loading={updateMutation.isPending}
                  >
                    {editing.is_active ? "Inactivate" : "Activate"}
                  </Button>
                </>
              )}
            </Space>
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

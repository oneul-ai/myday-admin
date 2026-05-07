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
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeleteOutlined, PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  autofillTaskRecommendation,
  createTaskRecommendation,
  deleteTaskRecommendation,
  getTaskRecommendations,
  updateTaskRecommendation,
  type TaskRecommendation,
  type TaskRecommendationUpdateInput,
} from "../api/taskRecommendations";

const TIME_SLOT_ORDER = ["ANYTIME", "MORNING", "AFTERNOON", "EVENING"] as const;

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

const JOB_TYPE_LABELS: Record<string, string> = {
  office_worker: "회사원",
  student: "학생",
  freelancer: "프리랜서",
  business_owner: "사업가",
  shift_worker: "교대근무자",
  homemaker: "육아/가사",
  job_seeker: "시험/취업 준비",
};

// `null` sentinel = 공통 풀 (job_type IS NULL).
const JOB_TYPE_FILTER_VALUE_ALL = "all";
const JOB_TYPE_FILTER_VALUE_COMMON = "null";

const ACTIVE_FILTER_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
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
  job_type: string | null;
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

export default function TaskRecommendationsPage() {
  const queryClient = useQueryClient();
  const [jobFilter, setJobFilter] = useState<string>(JOB_TYPE_FILTER_VALUE_ALL);
  const [activeFilter, setActiveFilter] = useState<string>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRecommendation | null>(null);
  const [form] = Form.useForm<FormValues>();

  const queryParams = useMemo(
    () => ({
      job_type:
        jobFilter === JOB_TYPE_FILTER_VALUE_ALL ? undefined : jobFilter,
      // time_slot 필터는 화면 분할로 대체됨 — 모든 슬롯을 한 번에 받아 클라에서 그룹핑.
      is_active:
        activeFilter === "all" ? undefined : activeFilter === "active",
      limit: 1000,
    }),
    [jobFilter, activeFilter],
  );

  const queryKey = ["task-recommendations", queryParams] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getTaskRecommendations(queryParams),
  });

  const supportedLocales = data?.supported_locales ?? DEFAULT_LOCALES;
  const validJobTypes = data?.valid_job_types ?? Object.keys(JOB_TYPE_LABELS);

  const grouped = useMemo(() => {
    const map: Record<string, TaskRecommendation[]> = {
      ANYTIME: [],
      MORNING: [],
      AFTERNOON: [],
      EVENING: [],
    };
    for (const r of data?.items ?? []) {
      if (map[r.time_slot]) map[r.time_slot].push(r);
    }
    return map;
  }, [data]);

  const jobTypeFilterOptions = useMemo(
    () => [
      { value: JOB_TYPE_FILTER_VALUE_ALL, label: "All jobs" },
      { value: JOB_TYPE_FILTER_VALUE_COMMON, label: "공통 (NULL)" },
      ...validJobTypes.map((v) => ({
        value: v,
        label: JOB_TYPE_LABELS[v] ?? v,
      })),
    ],
    [validJobTypes],
  );

  const jobTypeFormOptions = useMemo(
    () => [
      { value: "__null__", label: "공통 (NULL)" },
      ...validJobTypes.map((v) => ({
        value: v,
        label: JOB_TYPE_LABELS[v] ?? v,
      })),
    ],
    [validJobTypes],
  );

  const createMutation = useMutation({
    mutationFn: createTaskRecommendation,
    onSuccess: () => {
      message.success("Created");
      queryClient.invalidateQueries({ queryKey: ["task-recommendations"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      message.error(detail ?? "Create failed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: TaskRecommendationUpdateInput }) =>
      updateTaskRecommendation(id, body),
    onSuccess: () => {
      message.success("Updated");
      queryClient.invalidateQueries({ queryKey: ["task-recommendations"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      message.error(detail ?? "Update failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTaskRecommendation,
    onSuccess: () => {
      message.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["task-recommendations"] });
      closeModal();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      message.error(detail ?? "Delete failed");
    },
  });

  const autofillMutation = useMutation({
    mutationFn: ({ ko_title, time_slot }: { ko_title: string; time_slot?: string }) =>
      autofillTaskRecommendation(ko_title, time_slot),
    onSuccess: (result) => {
      const currentTitles = (form.getFieldValue("titles") as Record<string, string>) ?? {};
      form.setFieldsValue({
        emoji: result.emoji ?? undefined,
        focus_seconds: result.focus_seconds ?? undefined,
        titles: { ...currentTitles, ...result.titles },
      });
      message.success("Auto-filled");
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
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

  const openDetailModal = (reco: TaskRecommendation) => {
    setEditing(reco);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  // Form Select는 null을 직접 다루기 까다로워 "__null__" 센티넬로 표현한다.
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
        job_type: "__null__",
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

  // 슬롯별 카드 안에서 쓰는 컬럼 — 슬롯은 섹션 헤더에 이미 표시되므로 제외.
  const columns: ColumnsType<TaskRecommendation> = [
    {
      title: "Emoji",
      dataIndex: "emoji",
      width: 56,
      render: (v: string | null) => v ?? "-",
    },
    {
      title: "ko 제목",
      key: "ko_title",
      render: (_, row) => (
        <Space>
          <span>{row.titles?.ko ?? "(no ko title)"}</span>
          {!row.is_active && <Tag>Inactive</Tag>}
        </Space>
      ),
    },
    {
      title: "Job",
      dataIndex: "job_type",
      width: 110,
      render: (v: string | null) => jobTypeTag(v),
    },
    {
      title: "Focus",
      dataIndex: "focus_seconds",
      width: 70,
      align: "right",
      render: (v: number | null) => (v == null ? "-" : `${v}s`),
    },
  ];

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
          Task Recommendations
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          New recommendation
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          value={jobFilter}
          onChange={setJobFilter}
          options={jobTypeFilterOptions}
          style={{ width: 200 }}
        />
        <Segmented
          options={ACTIVE_FILTER_OPTIONS}
          value={activeFilter}
          onChange={(v) => setActiveFilter(String(v))}
        />
        <Typography.Text type="secondary">총 {data?.total ?? 0}개</Typography.Text>
      </Space>

      <Row gutter={[16, 16]}>
        {TIME_SLOT_ORDER.map((ts) => {
          const items = grouped[ts] ?? [];
          return (
            <Col key={ts} xs={24} md={12}>
              <Card
                size="small"
                title={
                  <Space>
                    <Tag color={TIME_SLOT_COLORS[ts] ?? "default"}>{ts}</Tag>
                    <Typography.Text type="secondary">{items.length} items</Typography.Text>
                  </Space>
                }
                styles={{ body: { padding: 0 } }}
              >
                <Table
                  rowKey="id"
                  loading={isLoading}
                  dataSource={items}
                  columns={columns}
                  size="small"
                  pagination={{ pageSize: 30, showSizeChanger: false, size: "small" }}
                  onRow={(row) => ({
                    onClick: () => openDetailModal(row),
                    style: { cursor: "pointer" },
                  })}
                  locale={{ emptyText: "없음" }}
                />
              </Card>
            </Col>
          );
        })}
      </Row>

      <Modal
        title={editing ? `Recommendation #${editing.id}` : "New recommendation"}
        open={modalOpen}
        onCancel={closeModal}
        width={620}
        destroyOnClose
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              {editing && (
                <Popconfirm
                  title="Delete this recommendation?"
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
            <Input placeholder="예: 30분 집중 업무하기" />
          </Form.Item>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Form.Item label="Emoji" name="emoji" style={{ flex: "0 0 100px" }}>
              <Input maxLength={10} />
            </Form.Item>
            <Form.Item label="Focus sec" name="focus_seconds" style={{ flex: "0 0 120px" }}>
              <InputNumber min={1} max={3600} style={{ width: "100%" }} />
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

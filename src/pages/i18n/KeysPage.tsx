import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  ClearOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  autoTranslateKey,
  bulkAutoTranslate,
  bulkPromoteDrafts,
  clearLocale,
  createKey,
  deleteTranslation,
  getDraftCounts,
  getTranslatableKeys,
  listKeys,
  patchTranslation,
  updateKey,
  upsertTranslation,
  type BulkAutoTranslateResponse,
  type I18nKey,
  type I18nScope,
  type I18nStatus,
  type I18nTranslation,
} from "../../api/i18n";

const { Title, Text, Paragraph } = Typography;

const SCOPE_OPTIONS: { value: I18nScope; label: string }[] = [
  { value: "app", label: "App" },
  { value: "widget", label: "Widget" },
];

const STATUS_TAG_COLOR: Record<I18nStatus, string> = {
  published: "green",
  review: "blue",
  draft: "gold",
};

const PAGE_SIZE = 50;

// 컬럼 표시 순서. API 가 알파벳순으로 주더라도 UI 에서는 이 순서로 정렬한다.
// 여기 없는 locale 은 뒤쪽에 알파벳순으로 붙는다.
const LOCALE_DISPLAY_ORDER = ["ko", "en", "ja", "zh-Hans", "zh-Hant"];

function orderLocales(locales: string[]): string[] {
  const known = LOCALE_DISPLAY_ORDER.filter((l) => locales.includes(l));
  const unknown = locales.filter((l) => !LOCALE_DISPLAY_ORDER.includes(l)).sort();
  return [...known, ...unknown];
}

export default function KeysPage() {
  const [scope, setScope] = useState<I18nScope>("app");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [missingLocale, setMissingLocale] = useState<string | undefined>();
  const [includeDeprecated, setIncludeDeprecated] = useState(false);
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingTranslation, setEditingTranslation] =
    useState<{ keyId: number; locale: string; current?: I18nTranslation } | null>(null);
  const [translatingKeyId, setTranslatingKeyId] = useState<number | null>(null);
  const [clearingLocale, setClearingLocale] = useState<string | null>(null);
  // null = 닫힘, "" = 전체(모든 locale), "en"/"ja"/... = 특정 locale 만
  const [bulkTranslate, setBulkTranslate] = useState<string | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const queryClient = useQueryClient();

  const queryKey = [
    "i18n-keys",
    { scope, q, missingLocale, includeDeprecated, page },
  ] as const;

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () =>
      listKeys({
        scope,
        q: q || undefined,
        missing_locale: missingLocale,
        include_deprecated: includeDeprecated,
        offset: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  });

  const supportedLocales = useMemo(
    () => orderLocales(data?.supported_locales ?? ["ko"]),
    [data?.supported_locales],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["i18n-keys"] });

  const onSearchSubmit = () => {
    setQ(searchInput.trim());
    setPage(1);
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Title level={3} style={{ marginBottom: 0 }}>
          i18n / Keys
        </Title>
        <Space>
          <Button
            icon={<CheckCircleOutlined />}
            onClick={() => setPromoteOpen(true)}
          >
            Draft 일괄 Publish
          </Button>
          <Button
            icon={<ThunderboltOutlined />}
            onClick={() => setBulkTranslate("")}
          >
            전체 AI 번역
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            새 키
          </Button>
        </Space>
      </div>

      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        ko 값은 xcstrings sync 로 자동 갱신되며, 다른 locale 은 셀을 클릭해 직접 편집하세요.
        편집은 draft 로 저장되고 Publish 페이지에서 published 상태로 발행됩니다.
      </Paragraph>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Segmented
            options={SCOPE_OPTIONS}
            value={scope}
            onChange={(v) => {
              setScope(v as I18nScope);
              setPage(1);
            }}
          />
          <Space wrap>
            <Input.Search
              placeholder="key 검색..."
              allowClear
              style={{ width: 280 }}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onSearch={onSearchSubmit}
            />
            <Select
              placeholder="누락 locale 필터"
              allowClear
              style={{ width: 200 }}
              value={missingLocale}
              onChange={(v) => {
                setMissingLocale(v);
                setPage(1);
              }}
              options={supportedLocales.map((l) => ({ value: l, label: `${l} 없는 키만` }))}
            />
            <Checkbox
              checked={includeDeprecated}
              onChange={(e) => {
                setIncludeDeprecated(e.target.checked);
                setPage(1);
              }}
            >
              deprecated 포함
            </Checkbox>
          </Space>
        </Space>
      </Card>

      {error && (
        <Alert
          type="error"
          showIcon
          message="키 목록을 불러오지 못했습니다."
          description={(error as Error).message}
        />
      )}

      <KeysTable
        data={data}
        isLoading={isLoading}
        supportedLocales={supportedLocales}
        page={page}
        onPageChange={setPage}
        translatingKeyId={translatingKeyId}
        onLocaleHeaderTranslate={(locale) => setBulkTranslate(locale)}
        clearingLocale={clearingLocale}
        onLocaleHeaderClear={async (locale) => {
          setClearingLocale(locale);
          try {
            const result = await clearLocale(scope, locale);
            message.success(`${locale} 번역 ${result.deleted}건이 삭제되었습니다.`);
            invalidate();
          } catch (err) {
            const detail =
              (err as { response?: { data?: { detail?: string } } })?.response
                ?.data?.detail || `${locale} 번역 삭제 실패`;
            message.error(detail);
          } finally {
            setClearingLocale(null);
          }
        }}
        onEditTranslation={(keyId, locale, current) =>
          setEditingTranslation({ keyId, locale, current })
        }
        onDeprecateToggle={async (k) => {
          await updateKey(k.id, { deprecated: k.deprecated_at == null });
          message.success(k.deprecated_at == null ? "deprecated 처리됨" : "복구됨");
          invalidate();
        }}
        onDescriptionSave={async (k, description) => {
          await updateKey(k.id, { description });
          message.success("description 저장됨");
          invalidate();
        }}
        onAutoTranslate={async (k) => {
          setTranslatingKeyId(k.id);
          try {
            const result = await autoTranslateKey(k.id);
            if (result.filled.length === 0) {
              message.info("채울 빈 locale 이 없습니다.");
            } else {
              message.success(
                `${result.filled.length}개 locale 번역 완료 (draft 로 저장됨)`,
              );
            }
            invalidate();
          } catch (err) {
            const detail =
              (err as { response?: { data?: { detail?: string } } })?.response
                ?.data?.detail || "AI 번역 실패";
            message.error(detail);
          } finally {
            setTranslatingKeyId(null);
          }
        }}
      />

      <CreateKeyModal
        open={createOpen}
        scope={scope}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          invalidate();
        }}
      />

      {editingTranslation && (
        <TranslationEditorModal
          key={`${editingTranslation.keyId}-${editingTranslation.locale}`}
          keyId={editingTranslation.keyId}
          locale={editingTranslation.locale}
          current={editingTranslation.current}
          onClose={() => setEditingTranslation(null)}
          onSaved={() => {
            setEditingTranslation(null);
            invalidate();
          }}
        />
      )}

      {bulkTranslate !== null && (
        <BulkTranslateModal
          key={`${scope}-${bulkTranslate || "all"}`}
          scope={scope}
          targetLocale={bulkTranslate || undefined}
          onClose={() => setBulkTranslate(null)}
          onFinished={() => invalidate()}
        />
      )}

      {promoteOpen && (
        <BulkPromoteDraftsModal
          scope={scope}
          onClose={() => setPromoteOpen(false)}
          onFinished={() => invalidate()}
        />
      )}
    </Space>
  );
}

// ---------- Table ----------

interface KeysTableProps {
  data: { total: number; keys: I18nKey[] } | undefined;
  isLoading: boolean;
  supportedLocales: string[];
  page: number;
  onPageChange: (p: number) => void;
  translatingKeyId: number | null;
  onLocaleHeaderTranslate: (locale: string) => void;
  clearingLocale: string | null;
  onLocaleHeaderClear: (locale: string) => Promise<void>;
  onEditTranslation: (keyId: number, locale: string, current?: I18nTranslation) => void;
  onDeprecateToggle: (k: I18nKey) => Promise<void>;
  onDescriptionSave: (k: I18nKey, description: string | null) => Promise<void>;
  onAutoTranslate: (k: I18nKey) => Promise<void>;
}

function KeysTable({
  data,
  isLoading,
  supportedLocales,
  page,
  onPageChange,
  translatingKeyId,
  onLocaleHeaderTranslate,
  clearingLocale,
  onLocaleHeaderClear,
  onEditTranslation,
  onDeprecateToggle,
  onDescriptionSave,
  onAutoTranslate,
}: KeysTableProps) {
  const columns = useMemo<ColumnsType<I18nKey>>(() => {
    const localeColumns: ColumnsType<I18nKey> = supportedLocales.map((locale) => ({
      title: (
        <Space size={4}>
          <span>{locale}</span>
          {locale !== "ko" && (
            <>
              <Tooltip title={`비어있는 ${locale} 값을 ko 에서 AI 번역`}>
                <Button
                  size="small"
                  type="text"
                  icon={<ThunderboltOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLocaleHeaderTranslate(locale);
                  }}
                />
              </Tooltip>
              <Popconfirm
                title={`${locale} 번역을 전부 삭제할까요?`}
                description={`현재 scope 모든 키의 ${locale} 값이 삭제됩니다. 되돌릴 수 없습니다.`}
                okText="전체 삭제"
                okButtonProps={{ danger: true }}
                cancelText="취소"
                onConfirm={() => onLocaleHeaderClear(locale)}
              >
                <Tooltip title={`${locale} 값 전체 비우기`}>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<ClearOutlined />}
                    loading={clearingLocale === locale}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
      key: `loc-${locale}`,
      width: 220,
      render: (_, k: I18nKey) => {
        const t = k.translations.find((x) => x.locale === locale);
        return (
          <TranslationCell
            translation={t}
            onClick={() => onEditTranslation(k.id, locale, t)}
          />
        );
      },
    }));

    return [
      {
        title: "Key",
        dataIndex: "key",
        key: "key",
        width: 280,
        fixed: "left",
        render: (key: string, k: I18nKey) => (
          <Space direction="vertical" size={0}>
            <Text strong style={{ wordBreak: "break-all" }}>
              {key}
            </Text>
            {k.deprecated_at && <Tag color="red">deprecated</Tag>}
          </Space>
        ),
      },
      ...localeColumns,
      {
        title: "Action",
        key: "action",
        width: 200,
        fixed: "right",
        render: (_, k: I18nKey) => {
          const hasKo = k.translations.some(
            (t) => t.locale === "ko" && t.value.trim() !== "",
          );
          const emptyLocaleCount = supportedLocales.filter(
            (loc) =>
              loc !== "ko" &&
              !k.translations.some(
                (t) => t.locale === loc && t.value.trim() !== "",
              ),
          ).length;
          const isTranslating = translatingKeyId === k.id;
          const canTranslate = hasKo && emptyLocaleCount > 0 && !k.deprecated_at;

          return (
            <Space size="small">
              <Tooltip
                title={
                  !hasKo
                    ? "ko 값이 있어야 AI 번역 가능합니다"
                    : emptyLocaleCount === 0
                      ? "채울 빈 locale 이 없습니다"
                      : k.deprecated_at
                        ? "deprecated 키는 번역 안 합니다"
                        : `${emptyLocaleCount}개 locale 채우기`
                }
              >
                <Popconfirm
                  title="AI 번역을 실행할까요?"
                  description={`ko 를 source 로 비어있는 ${emptyLocaleCount}개 locale 을 채웁니다. 기존 값은 덮어쓰지 않습니다.`}
                  okText="실행"
                  cancelText="취소"
                  disabled={!canTranslate || isTranslating}
                  onConfirm={() => onAutoTranslate(k)}
                >
                  <Button
                    size="small"
                    icon={<ThunderboltOutlined />}
                    type="primary"
                    ghost
                    loading={isTranslating}
                    disabled={!canTranslate}
                  >
                    AI 번역
                  </Button>
                </Popconfirm>
              </Tooltip>
              <Popconfirm
                title={k.deprecated_at ? "deprecated 해제할까요?" : "deprecate 처리할까요?"}
                description={
                  k.deprecated_at
                    ? "활성 상태로 돌아옵니다."
                    : "다음 publish 부터 번들에서 제외됩니다."
                }
                okText="확인"
                cancelText="취소"
                onConfirm={() => onDeprecateToggle(k)}
              >
                <Button size="small" danger={!k.deprecated_at}>
                  {k.deprecated_at ? "복구" : "Deprecate"}
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ];
  }, [
    supportedLocales,
    translatingKeyId,
    onLocaleHeaderTranslate,
    clearingLocale,
    onLocaleHeaderClear,
    onEditTranslation,
    onDeprecateToggle,
    onAutoTranslate,
  ]);

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={data?.keys ?? []}
      columns={columns}
      scroll={{ x: "max-content" }}
      sticky={{ offsetHeader: 0 }}
      pagination={{
        current: page,
        pageSize: PAGE_SIZE,
        total: data?.total ?? 0,
        showSizeChanger: false,
        showTotal: (total) => `${total} keys`,
        onChange: onPageChange,
      }}
      expandable={{
        expandedRowRender: (k) => (
          <ExpandedRow record={k} onDescriptionSave={onDescriptionSave} />
        ),
      }}
    />
  );
}

function TranslationCell({
  translation,
  onClick,
}: {
  translation?: I18nTranslation;
  onClick: () => void;
}) {
  if (!translation) {
    return (
      <Button type="dashed" size="small" block onClick={onClick}>
        <Text type="secondary">+ 추가</Text>
      </Button>
    );
  }
  return (
    <Tooltip title="클릭해서 편집">
      <div
        onClick={onClick}
        style={{
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid transparent",
          minHeight: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.border = "1px solid #d9d9d9")
        }
        onMouseLeave={(e) => (e.currentTarget.style.border = "1px solid transparent")}
      >
        <Text
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 160,
          }}
        >
          {translation.value}
        </Text>
        <Tag color={STATUS_TAG_COLOR[translation.status]} style={{ marginInlineEnd: 0 }}>
          {translation.status}
        </Tag>
      </div>
    </Tooltip>
  );
}

// ---------- Expanded row (description editor) ----------

function ExpandedRow({
  record,
  onDescriptionSave,
}: {
  record: I18nKey;
  onDescriptionSave: (k: I18nKey, description: string | null) => Promise<void>;
}) {
  const [value, setValue] = useState(record.description ?? "");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    try {
      const trimmed = value.trim();
      await onDescriptionSave(record, trimmed === "" ? null : trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" size="small" style={{ width: "100%", maxWidth: 800 }}>
      <Text strong>Description</Text>
      <Input.TextArea
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="이 키가 어디서 쓰이는지 한 줄 메모"
      />
      <Space>
        <Button type="primary" size="small" loading={saving} onClick={onSave}>
          저장
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          updated {new Date(record.updated_at).toLocaleString()}
        </Text>
      </Space>
    </Space>
  );
}

// ---------- Create modal ----------

function CreateKeyModal({
  open,
  scope,
  onClose,
  onCreated,
}: {
  open: boolean;
  scope: I18nScope;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form] = Form.useForm<{ key: string; description?: string }>();

  const mutation = useMutation({
    mutationFn: (body: { key: string; description?: string | null }) =>
      createKey({ scope, ...body }),
    onSuccess: () => {
      form.resetFields();
      message.success("키가 생성되었습니다.");
      onCreated();
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "생성 실패";
      message.error(detail);
    },
  });

  return (
    <Modal
      open={open}
      title="새 i18n 키"
      onCancel={onClose}
      okButtonProps={{ loading: mutation.isPending }}
      onOk={() => {
        form
          .validateFields()
          .then((values) =>
            mutation.mutate({
              key: values.key.trim(),
              description: values.description?.trim() || null,
            }),
          )
          .catch(() => undefined);
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label={`Scope: ${scope}`}
          help="Scope 는 메인 화면에서 선택됩니다."
        />
        <Form.Item
          name="key"
          label="Key"
          rules={[
            { required: true, message: "키를 입력해주세요." },
            {
              pattern: /^\S+$/,
              message: "공백을 포함할 수 없습니다.",
            },
          ]}
        >
          <Input placeholder="onboarding.welcome.title" />
        </Form.Item>
        <Form.Item name="description" label="Description (optional)">
          <Input.TextArea rows={2} placeholder="이 키가 어디서 쓰이는지" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ---------- Translation editor modal ----------

function TranslationEditorModal({
  keyId,
  locale,
  current,
  onClose,
  onSaved,
}: {
  keyId: number;
  locale: string;
  current?: I18nTranslation;
  onClose: () => void;
  onSaved: () => void;
}) {
  // 부모에서 key prop 으로 remount 시키므로 초기값을 props 에서 직접 가져온다.
  const [value, setValue] = useState(current?.value ?? "");
  const [status, setStatus] = useState<I18nStatus>(current?.status ?? "draft");

  const mutation = useMutation({
    mutationFn: async () => {
      if (current) {
        return patchTranslation(current.id, { value, status });
      }
      return upsertTranslation(keyId, locale, { value, status });
    },
    onSuccess: () => {
      message.success("저장됨");
      onSaved();
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "저장 실패";
      message.error(detail);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!current) return;
      await deleteTranslation(current.id);
    },
    onSuccess: () => {
      message.success("값이 제거되었습니다.");
      onSaved();
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "제거 실패";
      message.error(detail);
    },
  });

  const busy = mutation.isPending || deleteMutation.isPending;

  return (
    <Modal
      open
      title={`번역 편집 — ${locale}`}
      onCancel={onClose}
      okText="저장"
      onOk={() => mutation.mutate()}
      okButtonProps={{ loading: mutation.isPending, disabled: value.trim() === "" || busy }}
      cancelButtonProps={{ disabled: busy }}
      footer={(_, { OkBtn, CancelBtn }) => (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div>
            {current && (
              <Popconfirm
                title="이 번역을 제거할까요?"
                description={`${locale} 번역 행이 삭제되어 셀이 "+ 추가" 상태로 돌아갑니다.`}
                okText="제거"
                okButtonProps={{ danger: true }}
                cancelText="취소"
                disabled={busy}
                onConfirm={() => deleteMutation.mutate()}
              >
                <Button danger loading={deleteMutation.isPending} disabled={mutation.isPending}>
                  값 제거
                </Button>
              </Popconfirm>
            )}
          </div>
          <Space>
            <CancelBtn />
            <OkBtn />
          </Space>
        </div>
      )}
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Text strong>Value</Text>
          <Input.TextArea
            rows={4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`${locale} 번역`}
          />
        </div>
        <div>
          <Text strong>Status</Text>
          <div style={{ marginTop: 8 }}>
            <Segmented
              options={[
                { value: "draft", label: "draft" },
                { value: "review", label: "review" },
                { value: "published", label: "published" },
              ]}
              value={status}
              onChange={(v) => setStatus(v as I18nStatus)}
            />
          </div>
        </div>
        {current && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            updated {new Date(current.updated_at).toLocaleString()}
            {current.updated_by ? ` by ${current.updated_by}` : ""}
          </Text>
        )}
      </Space>
    </Modal>
  );
}

// ---------- Bulk translate modal ----------

function BulkTranslateModal({
  scope,
  targetLocale,
  onClose,
  onFinished,
}: {
  scope: I18nScope;
  /** 지정 시 해당 locale 만 대상으로 번역. 미지정이면 모든 비-ko locale. */
  targetLocale?: string;
  onClose: () => void;
  onFinished: () => void;
}) {
  const [result, setResult] = useState<BulkAutoTranslateResponse | null>(null);

  // 시작 전에 후보 키 개수를 미리 보여줌
  const candidatesQuery = useQuery({
    queryKey: ["i18n-translatable", scope, targetLocale ?? null],
    queryFn: () => getTranslatableKeys(scope, targetLocale),
  });

  const runMutation = useMutation({
    mutationFn: () =>
      bulkAutoTranslate(scope, targetLocale ? { locale: targetLocale } : undefined),
    onSuccess: (data) => {
      setResult(data);
      onFinished();
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "전체 번역 실패";
      message.error(detail);
    },
  });

  const candidateCount = candidatesQuery.data?.count ?? 0;
  const running = runMutation.isPending;
  const title = targetLocale
    ? `AI 번역 — ${targetLocale}`
    : "전체 AI 번역";
  const description = candidatesQuery.isLoading
    ? "후보 키를 세는 중..."
    : targetLocale
      ? `ko 값이 있고 ${targetLocale} 가 비어있는 키 ${candidateCount}개를 번역합니다.`
      : `ko 값이 있고 비어있는 locale 이 있는 키 ${candidateCount}개를 번역합니다.`;

  return (
    <Modal
      open
      title={title}
      onCancel={running ? undefined : onClose}
      maskClosable={!running}
      closable={!running}
      footer={
        result ? (
          <Button type="primary" onClick={onClose}>
            닫기
          </Button>
        ) : (
          <Space>
            <Button onClick={onClose} disabled={running}>
              취소
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={running}
              disabled={candidateCount === 0 || candidatesQuery.isLoading}
              onClick={() => runMutation.mutate()}
            >
              실행
            </Button>
          </Space>
        )
      }
      destroyOnHidden
    >
      {result ? (
        <BulkResultView result={result} />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message={
              <span>
                Scope: <Text strong>{scope}</Text>
                {targetLocale && (
                  <>
                    {" "}· Locale: <Text strong>{targetLocale}</Text>
                  </>
                )}
              </span>
            }
            description={description}
          />
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            • ko 가 source 로 사용되며 비어있는 locale 만 채웁니다.
            <br />
            • 이미 채워진 번역은 절대 덮어쓰지 않습니다.
            <br />
            • 새 번역은 <Tag color="gold">draft</Tag> 상태로 저장되어 Publish 전에 검수 가능합니다.
            <br />
            • 키 수에 따라 수 분이 걸릴 수 있으니 창을 닫지 말고 기다려주세요.
          </Paragraph>
          {running && (
            <Alert
              type="warning"
              showIcon
              message="진행 중... 페이지를 닫지 마세요."
              description="작업이 끝나면 결과가 표시됩니다."
            />
          )}
        </Space>
      )}
    </Modal>
  );
}

function BulkResultView({ result }: { result: BulkAutoTranslateResponse }) {
  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Alert
        type={result.errors.length === 0 ? "success" : "warning"}
        showIcon
        message={
          result.errors.length === 0
            ? "전체 번역 완료"
            : `완료 (일부 오류 ${result.errors.length}건)`
        }
        description={
          `${result.duration_seconds}초 소요 · 모델: ${result.model ?? "-"}` +
          (result.llm_calls != null ? ` · LLM 호출 ${result.llm_calls}회` : "")
        }
      />
      <Space size="large" wrap>
        <Stat label="대상 키" value={result.total} />
        <Stat label="번역 완료" value={result.success} color="#52c41a" />
        <Stat label="변경 없음" value={result.no_op} />
        <Stat label="채워진 번역" value={result.total_filled} />
        <Stat label="오류" value={result.errors.length} color="#ff4d4f" />
      </Space>
      {result.errors.length > 0 && (
        <details>
          <summary>
            <Text type="danger">오류 상세 ({result.errors.length})</Text>
          </summary>
          <div style={{ maxHeight: 240, overflow: "auto", marginTop: 8 }}>
            {result.errors.map((e) => (
              <div
                key={e.key_id}
                style={{
                  padding: "6px 0",
                  borderBottom: "1px solid #f0f0f0",
                  fontSize: 12,
                }}
              >
                <Text code>key_id={e.key_id}</Text>{" "}
                <Text type="secondary">{e.detail}</Text>
              </div>
            ))}
          </div>
        </details>
      )}
    </Space>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#8c8c8c" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

// ---------- Bulk promote drafts modal ----------

function BulkPromoteDraftsModal({
  scope,
  onClose,
  onFinished,
}: {
  scope: I18nScope;
  onClose: () => void;
  onFinished: () => void;
}) {
  const countsQuery = useQuery({
    queryKey: ["i18n-draft-counts", scope],
    queryFn: () => getDraftCounts(scope),
  });

  const promoteMutation = useMutation({
    mutationFn: () => bulkPromoteDrafts(scope),
    onSuccess: (data) => {
      message.success(`${data.promoted}건의 draft 번역이 published 로 바뀌었습니다.`);
      onFinished();
      onClose();
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "일괄 publish 실패";
      message.error(detail);
    },
  });

  const total = countsQuery.data?.count ?? 0;
  const byLocale = countsQuery.data?.by_locale ?? {};
  const localesSorted = Object.keys(byLocale).sort((a, b) => {
    const order = ["ko", "en", "ja", "zh-Hans", "zh-Hant"];
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <Modal
      open
      title="Draft 일괄 Publish"
      onCancel={onClose}
      okText="일괄 Publish"
      okButtonProps={{
        disabled: total === 0,
        loading: promoteMutation.isPending,
        icon: <CheckCircleOutlined />,
      }}
      onOk={() => promoteMutation.mutate()}
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message={
            <span>
              Scope: <Text strong>{scope}</Text>
            </span>
          }
          description={
            countsQuery.isLoading
              ? "draft 번역 수를 세는 중..."
              : total === 0
                ? "promote 할 draft 가 없습니다."
                : `${total}건의 draft 번역을 published 로 일괄 변경합니다.`
          }
        />
        {total > 0 && (
          <Space size="middle" wrap>
            {localesSorted.map((loc) => (
              <Stat key={loc} label={loc} value={byLocale[loc]} />
            ))}
          </Space>
        )}
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          • review/published 상태는 건드리지 않습니다.
          <br />
          • deprecated 키의 번역은 제외됩니다.
          <br />
          • published 로 바뀐 후에는 Publish 페이지에서 새 bundle 발행이 필요합니다.
        </Paragraph>
      </Space>
    </Modal>
  );
}

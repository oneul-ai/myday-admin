import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CloudUploadOutlined, DiffOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPublishDiff,
  getPublishStatus,
  publishBundle,
  type I18nScope,
  type PublishDiffResponse,
  type PublishStatusRow,
} from "../../api/i18n";

const { Title, Text, Paragraph } = Typography;

// Keys 페이지와 동일한 표시 순서.
const LOCALE_DISPLAY_ORDER = ["ko", "en", "ja", "zh-Hans", "zh-Hant"];

function orderRowsByLocale(rows: PublishStatusRow[]): PublishStatusRow[] {
  const idx = (loc: string) => {
    const i = LOCALE_DISPLAY_ORDER.indexOf(loc);
    return i === -1 ? 999 : i;
  };
  return [...rows].sort((a, b) => idx(a.locale) - idx(b.locale));
}

export default function PublishPage() {
  const [diffTarget, setDiffTarget] = useState<{
    scope: I18nScope;
    locale: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["i18n-publish-status"],
    queryFn: getPublishStatus,
  });

  const grouped = useMemo(() => {
    if (!data) return [];
    return data.scopes.map((scope) => ({
      scope,
      rows: orderRowsByLocale(data.rows.filter((r) => r.scope === scope)),
    }));
  }, [data]);

  const publishMutation = useMutation({
    mutationFn: ({ scope, locale }: { scope: I18nScope; locale: string }) =>
      publishBundle(scope, locale),
    onSuccess: (res) => {
      message.success(
        `Publish 완료 — ${res.scope}/${res.locale} v=${res.version} (${res.key_count} keys)`,
      );
      queryClient.invalidateQueries({ queryKey: ["i18n-publish-status"] });
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Publish 실패";
      message.error(detail);
    },
  });

  const bulkPublishMutation = useMutation({
    mutationFn: async ({
      scope,
      locales,
    }: {
      scope: I18nScope;
      locales: string[];
    }) => {
      const succeeded: string[] = [];
      const failed: { locale: string; detail: string }[] = [];
      // bundle version 발급이 (scope, locale) 별로 이루어지므로 순차 호출.
      for (const locale of locales) {
        try {
          await publishBundle(scope, locale);
          succeeded.push(locale);
        } catch (err) {
          const detail =
            (err as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail || "Publish 실패";
          failed.push({ locale, detail });
        }
      }
      return { scope, succeeded, failed };
    },
    onSuccess: ({ scope, succeeded, failed }) => {
      if (succeeded.length > 0) {
        message.success(
          `일괄 Publish 완료 — ${scope}: ${succeeded.join(", ")}`,
        );
      }
      failed.forEach(({ locale, detail }) =>
        message.error(`${scope}/${locale}: ${detail}`),
      );
      queryClient.invalidateQueries({ queryKey: ["i18n-publish-status"] });
    },
  });

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Title level={3} style={{ marginBottom: 0 }}>
          i18n / Publish
        </Title>
        <Button
          icon={<ReloadOutlined />}
          loading={isFetching}
          onClick={() => refetch()}
        >
          새로고침
        </Button>
      </div>

      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        각 (scope, locale) 의 <Text code>published</Text> 상태 번역만 모아 새 bundle 로 발행합니다.
        draft/review 상태 번역은 발행되지 않으며 deprecated 키는 제외됩니다.
      </Paragraph>

      {isLoading ? (
        <Card>
          <Spin />
        </Card>
      ) : (
        grouped.map(({ scope, rows }) => {
          const changedLocales = rows
            .filter((r) => r.diff.added + r.diff.removed + r.diff.changed > 0)
            .map((r) => r.locale);
          const bulkPublishing =
            bulkPublishMutation.isPending &&
            bulkPublishMutation.variables?.scope === scope;
          return (
          <Card
            key={scope}
            title={`Scope: ${scope}`}
            extra={
              <Popconfirm
                title="일괄 Publish 할까요?"
                description={`변경 사항이 있는 ${changedLocales.length}개 locale (${changedLocales.join(", ")}) 을 모두 발행합니다.`}
                okText="일괄 발행"
                cancelText="취소"
                onConfirm={() =>
                  bulkPublishMutation.mutate({ scope, locales: changedLocales })
                }
                disabled={changedLocales.length === 0}
              >
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  disabled={changedLocales.length === 0}
                  loading={bulkPublishing}
                >
                  전체 Publish{changedLocales.length > 0 ? ` (${changedLocales.length})` : ""}
                </Button>
              </Popconfirm>
            }
          >
            <PublishTable
              rows={rows}
              isPublishing={(scope, locale) =>
                (publishMutation.isPending &&
                  publishMutation.variables?.scope === scope &&
                  publishMutation.variables?.locale === locale) ||
                (bulkPublishing &&
                  bulkPublishMutation.variables?.locales.includes(locale) === true)
              }
              onShowDiff={(row) =>
                setDiffTarget({ scope: row.scope, locale: row.locale })
              }
              onPublish={(row) =>
                publishMutation.mutate({ scope: row.scope, locale: row.locale })
              }
            />
          </Card>
          );
        })
      )}

      {diffTarget && (
        <DiffModal
          scope={diffTarget.scope}
          locale={diffTarget.locale}
          onClose={() => setDiffTarget(null)}
          onPublish={() => {
            publishMutation.mutate({
              scope: diffTarget.scope,
              locale: diffTarget.locale,
            });
            setDiffTarget(null);
          }}
        />
      )}
    </Space>
  );
}

// ---------- Table ----------

interface PublishTableProps {
  rows: PublishStatusRow[];
  isPublishing: (scope: I18nScope, locale: string) => boolean;
  onShowDiff: (row: PublishStatusRow) => void;
  onPublish: (row: PublishStatusRow) => void;
}

function PublishTable({ rows, isPublishing, onShowDiff, onPublish }: PublishTableProps) {
  const columns: ColumnsType<PublishStatusRow> = [
    {
      title: "Locale",
      dataIndex: "locale",
      key: "locale",
      width: 100,
      render: (locale: string) => <Text strong>{locale}</Text>,
    },
    {
      title: "변경 사항",
      key: "diff",
      width: 320,
      render: (_, row) => {
        const { added, removed, changed } = row.diff;
        const total = added + removed + changed;
        if (total === 0) {
          return <Text type="secondary">변경 없음</Text>;
        }
        return (
          <Space size="small">
            {added > 0 && (
              <Tag color="green">+{added} added</Tag>
            )}
            {changed > 0 && (
              <Tag color="blue">~{changed} changed</Tag>
            )}
            {removed > 0 && (
              <Tag color="red">-{removed} removed</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Latest Bundle",
      key: "latest",
      width: 280,
      render: (_, row) => {
        if (row.latest_version == null) {
          return <Text type="secondary">미발행</Text>;
        }
        return (
          <Space direction="vertical" size={0}>
            <Text>v={row.latest_version}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(row.latest_published_at!).toLocaleString()}
              {row.latest_published_by ? ` · ${row.latest_published_by}` : ""}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Publish 후 키 수",
      key: "count",
      width: 140,
      render: (_, row) => (
        <Badge
          count={row.publishable_key_count}
          showZero
          overflowCount={9999}
          color={row.publishable_key_count > 0 ? "blue" : "default"}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 240,
      render: (_, row) => {
        const totalDiff = row.diff.added + row.diff.removed + row.diff.changed;
        const publishing = isPublishing(row.scope, row.locale);
        return (
          <Space size="small">
            <Button
              size="small"
              icon={<DiffOutlined />}
              disabled={totalDiff === 0}
              onClick={() => onShowDiff(row)}
            >
              Diff
            </Button>
            <Popconfirm
              title="Publish 할까요?"
              description={
                totalDiff === 0
                  ? "변경 사항이 없습니다. 그래도 새 버전을 발행하시겠어요?"
                  : `${totalDiff}건의 변경이 새 bundle 에 반영됩니다.`
              }
              okText="발행"
              cancelText="취소"
              onConfirm={() => onPublish(row)}
            >
              <Button
                size="small"
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={publishing}
              >
                Publish
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      rowKey={(r) => `${r.scope}-${r.locale}`}
      dataSource={rows}
      columns={columns}
      pagination={false}
      size="middle"
    />
  );
}

// ---------- Diff modal ----------

function DiffModal({
  scope,
  locale,
  onClose,
  onPublish,
}: {
  scope: I18nScope;
  locale: string;
  onClose: () => void;
  onPublish: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["i18n-publish-diff", scope, locale],
    queryFn: () => getPublishDiff(scope, locale),
  });

  return (
    <Modal
      open
      title={`Diff — ${scope} / ${locale}`}
      onCancel={onClose}
      width={800}
      footer={
        <Space>
          <Button onClick={onClose}>닫기</Button>
          <Popconfirm
            title="Publish 할까요?"
            description="새 bundle 버전이 발행됩니다."
            okText="발행"
            cancelText="취소"
            onConfirm={onPublish}
          >
            <Button type="primary" icon={<CloudUploadOutlined />}>
              여기서 Publish
            </Button>
          </Popconfirm>
        </Space>
      }
      destroyOnHidden
    >
      {isLoading ? (
        <Spin />
      ) : error ? (
        <Alert type="error" message={(error as Error).message} />
      ) : data ? (
        <DiffContent diff={data} />
      ) : null}
    </Modal>
  );
}

function DiffContent({ diff }: { diff: PublishDiffResponse }) {
  const total = diff.added.length + diff.changed.length + diff.removed.length;
  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Space size="large" wrap>
        <Statistic
          title="이전 버전"
          value={diff.previous_version ?? "—"}
        />
        <Statistic
          title="추가"
          value={diff.added.length}
          valueStyle={{ color: "#52c41a" }}
        />
        <Statistic
          title="변경"
          value={diff.changed.length}
          valueStyle={{ color: "#1677ff" }}
        />
        <Statistic
          title="삭제"
          value={diff.removed.length}
          valueStyle={{ color: "#ff4d4f" }}
        />
        <Statistic title="동일" value={diff.unchanged} />
      </Space>

      {total === 0 && (
        <Alert
          type="info"
          showIcon
          message="이전 publish 이후 변경 사항이 없습니다."
        />
      )}

      {diff.added.length > 0 && (
        <DiffSection
          title="추가된 키"
          color="#52c41a"
          rows={diff.added.map((d) => ({
            key: d.key,
            primary: d.value ?? "",
          }))}
        />
      )}
      {diff.changed.length > 0 && (
        <DiffSection
          title="변경된 키"
          color="#1677ff"
          rows={diff.changed.map((d) => ({
            key: d.key,
            primary: d.new ?? "",
            secondary: d.old ?? "",
          }))}
        />
      )}
      {diff.removed.length > 0 && (
        <DiffSection
          title="삭제된 키"
          color="#ff4d4f"
          rows={diff.removed.map((d) => ({
            key: d.key,
            primary: d.value ?? "",
          }))}
        />
      )}
    </Space>
  );
}

function DiffSection({
  title,
  color,
  rows,
}: {
  title: string;
  color: string;
  rows: { key: string; primary: string; secondary?: string }[];
}) {
  return (
    <div>
      <Text strong style={{ color }}>
        {title} ({rows.length})
      </Text>
      <div
        style={{
          maxHeight: 240,
          overflow: "auto",
          marginTop: 8,
          border: "1px solid #f0f0f0",
          borderRadius: 4,
        }}
      >
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid #f0f0f0",
              fontSize: 13,
            }}
          >
            <Text code style={{ fontSize: 12 }}>
              {row.key}
            </Text>
            <div style={{ marginTop: 4 }}>
              {row.secondary !== undefined && (
                <div style={{ color: "#8c8c8c", textDecoration: "line-through" }}>
                  {row.secondary}
                </div>
              )}
              <div>{row.primary}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

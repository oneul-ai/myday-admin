import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  Popconfirm,
  Result,
  Segmented,
  Space,
  Statistic,
  Table,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadFile, UploadProps } from "antd";
import { ExclamationCircleFilled, InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import {
  syncApply,
  syncPreview,
  type I18nScope,
  type NonKoClearedItem,
  type SyncApplyResponse,
  type SyncPreviewResponse,
} from "../../api/i18n";
import DevEnvAlert from "./DevEnvAlert";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const SCOPE_OPTIONS: { value: I18nScope; label: string }[] = [
  { value: "app", label: "App" },
  { value: "widget", label: "Widget" },
];

function isXcstringsFile(file: File): boolean {
  if (file.name.toLowerCase().endsWith(".xcstrings")) return true;
  if (file.type === "application/json") return true;
  if (file.type === "") return true;
  return false;
}

export default function SyncPage() {
  const [scope, setScope] = useState<I18nScope>("app");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SyncPreviewResponse | null>(null);
  const [applied, setApplied] = useState<SyncApplyResponse | null>(null);

  const previewMutation = useMutation({
    mutationFn: ({ scope, file }: { scope: I18nScope; file: File }) =>
      syncPreview(scope, file),
    onSuccess: (data) => {
      setPreview(data);
      setApplied(null);
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Preview 실패";
      message.error(detail);
    },
  });

  const applyMutation = useMutation({
    mutationFn: ({
      scope,
      file,
      force,
    }: {
      scope: I18nScope;
      file: File;
      force?: boolean;
    }) => syncApply(scope, file, { force }),
    onSuccess: (data) => {
      setApplied(data);
      setPreview(null);
      message.success(data.force ? "Force Sync 완료" : "동기화 완료");
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Sync 실패";
      message.error(detail);
    },
  });

  const draggerProps: UploadProps = {
    multiple: false,
    accept: ".xcstrings,application/json",
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (f) => {
      if (!isXcstringsFile(f)) {
        message.error(".xcstrings 파일을 올려주세요");
        return Upload.LIST_IGNORE;
      }
      setFile(f);
      setPreview(null);
      setApplied(null);
      // beforeUpload 이 false 를 반환하면 antd 가 업로드를 막아준다.
      return false;
    },
    onRemove: () => {
      setFile(null);
      setPreview(null);
      setApplied(null);
    },
    fileList: file
      ? ([{ uid: "1", name: file.name, status: "done" }] as UploadFile[])
      : [],
  };

  const onPreviewClick = () => {
    if (!file) return;
    previewMutation.mutate({ scope, file });
  };

  const onApplyClick = (force: boolean = false) => {
    if (!file) return;
    applyMutation.mutate({ scope, file, force });
  };

  const removedCount = preview?.diff.removed.length ?? 0;
  const prunedCount = preview?.diff.pruned.length ?? 0;
  const forceTranslationDeleteRows = preview?.diff.force_translation_deletes ?? [];
  const forceTranslationDeleteTotal = forceTranslationDeleteRows.reduce(
    (acc, item) => acc + item.locales.length,
    0,
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Title level={3} style={{ marginBottom: 0 }}>
        i18n / Sync
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Xcode 의 <Text code>Localizable.xcstrings</Text> 파일을 업로드하면 신규 키 등록,
        삭제된 키 deprecate, 한국어 소스값이 자동으로 동기화됩니다.
      </Paragraph>

      <DevEnvAlert />

      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Text strong>Scope</Text>
            <div style={{ marginTop: 8 }}>
              <Segmented
                options={SCOPE_OPTIONS}
                value={scope}
                onChange={(v) => {
                  setScope(v as I18nScope);
                  setPreview(null);
                  setApplied(null);
                }}
              />
            </div>
          </div>

          <Dragger {...draggerProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">파일을 드롭하거나 클릭해서 선택하세요</p>
            <p className="ant-upload-hint">
              Xcode 의 <Text code>Localizable.xcstrings</Text> 파일을 그대로 올리면 됩니다.
            </p>
          </Dragger>

          <Space>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              disabled={!file}
              loading={previewMutation.isPending}
              onClick={onPreviewClick}
            >
              Preview
            </Button>
            <Button
              disabled={!preview || applyMutation.isPending}
              loading={
                applyMutation.isPending && !applyMutation.variables?.force
              }
              onClick={() => onApplyClick(false)}
            >
              Sync 확정
            </Button>
            <Popconfirm
              title="Force Sync 를 실행할까요?"
              description={
                <div style={{ maxWidth: 380 }}>
                  • xcstrings 에 없는 키 <Text strong>{removedCount}건</Text> hard delete<br />
                  • 이미 deprecated 상태인 키 <Text strong>{prunedCount}건</Text> cleanup<br />
                  • xcstrings 에 해당 locale 이 없는 번역 <Text strong>{forceTranslationDeleteTotal}건</Text> hard delete<br />
                  <Text type="danger">되돌릴 수 없습니다.</Text>
                </div>
              }
              okText="강제 실행"
              okButtonProps={{ danger: true }}
              cancelText="취소"
              disabled={!preview || applyMutation.isPending}
              onConfirm={() => onApplyClick(true)}
            >
              <Button
                danger
                icon={<ExclamationCircleFilled />}
                disabled={!preview || applyMutation.isPending}
                loading={
                  applyMutation.isPending && applyMutation.variables?.force === true
                }
              >
                Force Sync 확정
              </Button>
            </Popconfirm>
          </Space>
        </Space>
      </Card>

      {preview && <PreviewSection preview={preview} />}
      {applied && <AppliedSection applied={applied} />}
    </Space>
  );
}

function PreviewSection({ preview }: { preview: SyncPreviewResponse }) {
  const { diff, total_keys_in_file } = preview;
  const totalClearedTranslations = diff.non_ko_cleared.reduce(
    (acc, item) => acc + item.locales.length,
    0,
  );
  const forceTranslationDeleteTotal = diff.force_translation_deletes.reduce(
    (acc, item) => acc + item.locales.length,
    0,
  );
  const hasChanges =
    diff.added.length +
      diff.removed.length +
      diff.pruned.length +
      diff.description_changed.length +
      diff.ko_value_changed.length +
      diff.non_ko_cleared.length +
      diff.force_translation_deletes.length >
    0;

  return (
    <Card title="Preview">
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space size="large" wrap>
          <Statistic title="파일 내 키" value={total_keys_in_file} />
          <Statistic
            title="신규 (added)"
            value={diff.added.length}
            valueStyle={{ color: "#52c41a" }}
          />
          <Statistic
            title="삭제 (deprecate)"
            value={diff.removed.length}
            valueStyle={{ color: "#ff4d4f" }}
          />
          <Statistic
            title="이미 deprecated (force 시 hard delete)"
            value={diff.pruned.length}
            valueStyle={{ color: "#8c8c8c" }}
          />
          <Statistic
            title="description 변경"
            value={diff.description_changed.length}
          />
          <Statistic
            title="ko 값 변경"
            value={diff.ko_value_changed.length}
          />
          <Statistic
            title="non-ko 클리어"
            value={totalClearedTranslations}
            valueStyle={{ color: "#fa8c16" }}
          />
          <Statistic
            title="번역 삭제 (force 시)"
            value={forceTranslationDeleteTotal}
            valueStyle={{ color: "#ff4d4f" }}
          />
          <Statistic title="동일" value={diff.unchanged} />
        </Space>

        {diff.non_ko_cleared.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="ko 값이 바뀐 키의 다른 locale 번역이 초기화됩니다."
            description={`총 ${totalClearedTranslations}건 (영향 키 ${diff.non_ko_cleared.length}개). 빈 값 + draft 상태로 바뀌므로 publish 전에 재번역이 필요합니다.`}
          />
        )}

        {(diff.removed.length > 0 ||
          diff.pruned.length > 0 ||
          diff.force_translation_deletes.length > 0) && (
          <Alert
            type="error"
            showIcon
            icon={<ExclamationCircleFilled />}
            message="Force Sync 시 영구 삭제되는 항목"
            description={
              <div>
                <div>
                  • 삭제될 active 키 (translations 포함): <Text strong>{diff.removed.length}건</Text>
                </div>
                <div>
                  • cleanup 될 deprecated 키: <Text strong>{diff.pruned.length}건</Text>
                </div>
                <div>
                  • xcstrings 에 해당 locale 이 없는 번역 row: <Text strong>{forceTranslationDeleteTotal}건</Text>
                  {" "}(영향 키 {diff.force_translation_deletes.length}개)
                </div>
                <div style={{ color: "#8c8c8c", marginTop: 4 }}>
                  일반 Sync 는 active 키만 deprecate 처리하고 비-ko 번역은 보존됩니다.
                </div>
              </div>
            }
          />
        )}

        {!hasChanges && (
          <Alert
            type="info"
            showIcon
            message="동기화할 변경 사항이 없습니다."
          />
        )}

        {hasChanges && (
          <Collapse
            defaultActiveKey={["added", "removed"]}
            items={[
              diff.added.length > 0 && {
                key: "added",
                label: `신규 키 ${diff.added.length}건`,
                children: <AddedTable rows={diff.added} />,
              },
              diff.removed.length > 0 && {
                key: "removed",
                label: `삭제 (deprecate / force 시 hard delete) ${diff.removed.length}건`,
                children: <SimpleKeyTable rows={diff.removed} />,
              },
              diff.pruned.length > 0 && {
                key: "pruned",
                label: `이미 deprecated — force 시 hard delete ${diff.pruned.length}건`,
                children: <SimpleKeyTable rows={diff.pruned} />,
              },
              diff.description_changed.length > 0 && {
                key: "desc",
                label: `description 변경 ${diff.description_changed.length}건`,
                children: <DiffTable rows={diff.description_changed} />,
              },
              diff.ko_value_changed.length > 0 && {
                key: "ko",
                label: `ko 값 변경 ${diff.ko_value_changed.length}건`,
                children: <DiffTable rows={diff.ko_value_changed} />,
              },
              diff.non_ko_cleared.length > 0 && {
                key: "cleared",
                label: `non-ko 클리어 ${diff.non_ko_cleared.length}건 (총 ${totalClearedTranslations}개 번역)`,
                children: <NonKoClearedTable rows={diff.non_ko_cleared} />,
              },
              diff.force_translation_deletes.length > 0 && {
                key: "force-translation-deletes",
                label: `force 시 삭제될 번역 ${diff.force_translation_deletes.length}건 (총 ${forceTranslationDeleteTotal}개 번역)`,
                children: (
                  <NonKoClearedTable rows={diff.force_translation_deletes} />
                ),
              },
            ].filter(Boolean) as { key: string; label: string; children: React.ReactNode }[]}
          />
        )}
      </Space>
    </Card>
  );
}

function AppliedSection({ applied }: { applied: SyncApplyResponse }) {
  const {
    added,
    resurrected,
    removed,
    pruned,
    updated,
    ko_upserted,
    non_ko_cleared,
    non_ko_upserted,
    force_translations_deleted,
  } = applied.applied;
  const isForce = applied.force;
  return (
    <Card>
      <Result
        status="success"
        title={isForce ? "Force Sync 가 적용되었습니다." : "동기화가 적용되었습니다."}
        subTitle={
          <Space size="large" wrap style={{ marginTop: 12 }}>
            <Statistic title="신규" value={added} />
            <Statistic title="부활" value={resurrected} />
            <Statistic
              title={isForce ? "Hard delete" : "삭제 (deprecated)"}
              value={removed}
              valueStyle={
                isForce && removed > 0 ? { color: "#ff4d4f" } : undefined
              }
            />
            <Statistic
              title="cleanup (pruned)"
              value={pruned}
              valueStyle={pruned > 0 ? { color: "#ff4d4f" } : undefined}
            />
            <Statistic title="description 갱신" value={updated} />
            <Statistic title="ko 번역 upsert" value={ko_upserted} />
            {isForce && (
              <Statistic
                title="non-ko 번역 upsert"
                value={non_ko_upserted}
              />
            )}
            {isForce ? (
              <Statistic
                title="번역 hard delete"
                value={force_translations_deleted}
                valueStyle={
                  force_translations_deleted > 0 ? { color: "#ff4d4f" } : undefined
                }
              />
            ) : (
              <Statistic
                title="non-ko 클리어"
                value={non_ko_cleared}
                valueStyle={non_ko_cleared > 0 ? { color: "#fa8c16" } : undefined}
              />
            )}
          </Space>
        }
      />
    </Card>
  );
}

// ---------- Diff sub-tables ----------

type DiffRow = {
  key: string;
  description?: string | null;
  ko_value?: string | null;
  resurrect?: boolean;
  old?: string | null;
  new?: string | null;
};

function AddedTable({ rows }: { rows: DiffRow[] }) {
  if (rows.length === 0) return <Empty />;
  return (
    <Table
      size="small"
      rowKey="key"
      dataSource={rows}
      pagination={{ pageSize: 20, showSizeChanger: false }}
      columns={[
        { title: "Key", dataIndex: "key", width: 280, ellipsis: true },
        {
          title: "ko",
          dataIndex: "ko_value",
          render: (v: string | null) =>
            v ? v : <Text type="secondary">(없음)</Text>,
        },
        {
          title: "Description",
          dataIndex: "description",
          render: (v: string | null) =>
            v ? v : <Text type="secondary">—</Text>,
        },
        {
          title: "비고",
          width: 80,
          render: (_, r: DiffRow) =>
            r.resurrect ? <Text type="warning">부활</Text> : null,
        },
      ]}
    />
  );
}

function SimpleKeyTable({ rows }: { rows: DiffRow[] }) {
  return (
    <Table
      size="small"
      rowKey="key"
      dataSource={rows}
      pagination={{ pageSize: 20, showSizeChanger: false }}
      columns={[{ title: "Key", dataIndex: "key" }]}
    />
  );
}

function NonKoClearedTable({ rows }: { rows: NonKoClearedItem[] }) {
  return (
    <Table
      size="small"
      rowKey="key"
      dataSource={rows}
      pagination={{ pageSize: 20, showSizeChanger: false }}
      columns={[
        { title: "Key", dataIndex: "key", width: 320, ellipsis: true },
        {
          title: "초기화될 locale",
          dataIndex: "locales",
          render: (locales: string[]) => locales.join(", "),
        },
      ]}
    />
  );
}

function DiffTable({ rows }: { rows: DiffRow[] }) {
  return (
    <Table
      size="small"
      rowKey="key"
      dataSource={rows}
      pagination={{ pageSize: 20, showSizeChanger: false }}
      columns={[
        { title: "Key", dataIndex: "key", width: 280, ellipsis: true },
        {
          title: "Before",
          dataIndex: "old",
          render: (v: string | null) =>
            v ? v : <Text type="secondary">(없음)</Text>,
        },
        {
          title: "After",
          dataIndex: "new",
          render: (v: string | null) =>
            v ? v : <Text type="secondary">(없음)</Text>,
        },
      ]}
    />
  );
}

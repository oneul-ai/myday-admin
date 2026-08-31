import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteRemoteConfigEntry,
  getRemoteConfig,
  setRemoteConfigEntry,
} from "../api/appSettings";

// 값 입력은 JSON 으로 해석하고, JSON 이 아니면 통째로 문자열로 저장한다.
// 예: true → boolean, 20 → number, {"a":1} → object, hello → string "hello".
// 문자열 "123" 을 원하면 따옴표를 포함해 "123" 으로 입력한다.
function parseValueInput(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function typeLabel(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function errorDetail(err: unknown) {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data
    ?.detail;
}

const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

interface EntryRow {
  key: string;
  value: unknown;
}

export default function RemoteConfigPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{ key: string; value: string }>();
  const [modalOpen, setModalOpen] = useState(false);
  // null 이면 새 항목 작성, 아니면 해당 key 수정 (key 는 수정 불가).
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const valueInput = Form.useWatch("value", form);

  const { data, isLoading } = useQuery({
    queryKey: ["remote-config"],
    queryFn: getRemoteConfig,
  });

  const rows: EntryRow[] = useMemo(
    () =>
      Object.entries(data ?? {})
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    [data],
  );

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      setRemoteConfigEntry(key, value),
    onSuccess: (map) => {
      queryClient.setQueryData(["remote-config"], map);
      message.success("저장되었습니다");
      setModalOpen(false);
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "저장 실패");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRemoteConfigEntry,
    onSuccess: (map) => {
      queryClient.setQueryData(["remote-config"], map);
      message.success("삭제되었습니다");
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "삭제 실패");
    },
  });

  const openCreate = () => {
    setEditingKey(null);
    form.setFieldsValue({ key: "", value: "" });
    setModalOpen(true);
  };

  const openEdit = (row: EntryRow) => {
    setEditingKey(row.key);
    // JSON.stringify 로 프리필해야 문자열 "123" 같은 값이 숫자로 재해석되지 않는다.
    form.setFieldsValue({ key: row.key, value: JSON.stringify(row.value) });
    setModalOpen(true);
  };

  const handleSave = (values: { key: string; value: string }) => {
    saveMutation.mutate({
      key: editingKey ?? values.key.trim(),
      value: parseValueInput(values.value),
    });
  };

  const parsedPreview =
    valueInput != null && valueInput !== "" ? parseValueInput(valueInput) : undefined;

  const columns = [
    {
      title: "Key",
      dataIndex: "key",
      render: (key: string) => <Typography.Text code>{key}</Typography.Text>,
    },
    {
      title: "Type",
      dataIndex: "value",
      key: "type",
      width: 100,
      render: (value: unknown) => <Tag>{typeLabel(value)}</Tag>,
    },
    {
      title: "Value",
      dataIndex: "value",
      render: (value: unknown) => (
        <Typography.Text code style={{ wordBreak: "break-all" }}>
          {JSON.stringify(value)}
        </Typography.Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_: unknown, row: EntryRow) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>
            수정
          </Button>
          <Popconfirm
            title="항목을 삭제할까요?"
            description="다음 앱 실행부터 이 key 는 내려가지 않습니다."
            okText="삭제"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMutation.mutate(row.key)}
          >
            <Button size="small" danger>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <Space
        style={{
          marginBottom: 16,
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Remote Config
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          새 항목
        </Button>
      </Space>
      <Typography.Paragraph type="secondary">
        여기 등록한 key-value 는 앱 실행 시 /awake 응답의 remote_config 로
        그대로 내려갑니다. key 는 언제든 삭제될 수 있는 계약이므로,
        클라이언트는 모든 key 를 optional 로 다루고 없으면 기본 동작을
        유지해야 합니다.
      </Typography.Paragraph>

      <Table<EntryRow>
        rowKey="key"
        loading={isLoading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        size="middle"
      />

      <Modal
        title={editingKey ? `항목 수정 — ${editingKey}` : "새 항목"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="저장"
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="key"
            label="Key"
            extra="영숫자로 시작, 영숫자·점·언더스코어·하이픈 (최대 100자). 예: feature.preview"
            rules={[
              { required: true, whitespace: true, message: "필수입니다" },
              {
                validator: (_: unknown, v: string) =>
                  !v || KEY_RE.test(v.trim())
                    ? Promise.resolve()
                    : Promise.reject(new Error("형식이 올바르지 않습니다")),
              },
            ]}
          >
            <Input placeholder="feature.preview" disabled={!!editingKey} />
          </Form.Item>
          <Form.Item
            name="value"
            label="Value"
            extra='JSON 으로 해석됩니다 — true, 20, "text", {"a":1} 등. JSON 이 아니면 통째로 문자열로 저장됩니다.'
            rules={[{ required: true, message: "필수입니다" }]}
          >
            <Input.TextArea rows={3} placeholder='true / 20 / "text" / {"a":1}' />
          </Form.Item>
          {parsedPreview !== undefined && (
            <Alert
              type="info"
              message={
                <>
                  저장될 값: <Tag>{typeLabel(parsedPreview)}</Tag>
                  <Typography.Text code>
                    {JSON.stringify(parsedPreview)}
                  </Typography.Text>
                </>
              }
            />
          )}
        </Form>
      </Modal>
    </div>
  );
}

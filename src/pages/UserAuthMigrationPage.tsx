import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Popconfirm,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  type AuthMigrationPreview,
  type AuthMigrationResult,
  type FirebaseProviderEntry,
  migrateUserAuth,
  previewAuthMigration,
} from "../api/authMigration";

function errorDetail(err: unknown): string | undefined {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data
    ?.detail;
}

function ProviderTags({ providers }: { providers: FirebaseProviderEntry[] }) {
  if (providers.length === 0) return <Tag>없음</Tag>;
  return (
    <>
      {providers.map((p) => (
        <Tag key={`${p.provider_id}:${p.uid}`} color={p.provider_id === "google.com" ? "blue" : "default"}>
          {p.provider_id}
          {p.email ? ` (${p.email})` : ""}
        </Tag>
      ))}
    </>
  );
}

export default function UserAuthMigrationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<{ target_uid: string; source: string }>();
  const [preview, setPreview] = useState<AuthMigrationPreview | null>(null);
  const [result, setResult] = useState<AuthMigrationResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const values = await form.validateFields();
      return previewAuthMigration(values.target_uid.trim(), values.source.trim());
    },
    onSuccess: (data) => {
      setPreview(data);
      setResult(null);
    },
    onError: (err: unknown) => {
      if ((err as { errorFields?: unknown }).errorFields) return;
      message.error(errorDetail(err) ?? "미리보기 조회에 실패했습니다");
    },
  });

  const migrateMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error("no preview");
      return migrateUserAuth(preview.target.uid, {
        source_uid: preview.source.uid,
        confirm_delete_source_row: !!preview.source.db_row,
      });
    },
    onSuccess: (data) => {
      setResult(data);
      setPreview(null);
      message.success("이관이 완료되었습니다");
      queryClient.invalidateQueries({ queryKey: ["user", data.target.uid] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => {
      message.error(errorDetail(err) ?? "이관에 실패했습니다");
    },
  });

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
        유저 인증 이관
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: 720 }}>
        유저의 로그인 수단을 다른 provider(Google ↔ Apple) 또는 같은 provider 의
        다른 계정으로 교체합니다. uid 와 데이터는 그대로 두고 Firebase 쪽
        credential 만 갈아끼우는 방식입니다.
        <br />
        <b>전제:</b> 유저가 <b>새 계정으로 앱에 한 번 로그인</b>해 새 Firebase
        계정(source)이 만들어져 있어야 합니다. 이관하면 source 계정은 삭제되고,
        기존 유저(target)가 그 로그인 수단을 넘겨받습니다. 유저의 기존 세션은
        로그아웃 처리되며 새 계정으로 다시 로그인해야 합니다.
      </Typography.Paragraph>

      <Card title="대상 지정" style={{ maxWidth: 720 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ target_uid: searchParams.get("uid") ?? "", source: "" }}
          onValuesChange={() => {
            setPreview(null);
            setResult(null);
          }}
          onFinish={() => previewMutation.mutate()}
        >
          <Form.Item
            name="target_uid"
            label="Target UID (데이터를 유지할 기존 유저)"
            rules={[{ required: true, whitespace: true, message: "target uid 를 입력하세요" }]}
          >
            <Input placeholder="기존 유저의 uid" />
          </Form.Item>
          <Form.Item
            name="source"
            label="Source (새로 로그인한 Firebase 계정의 uid 또는 이메일)"
            rules={[{ required: true, whitespace: true, message: "source uid 또는 이메일을 입력하세요" }]}
            extra="유저가 새 provider/계정으로 로그인한 뒤 생긴 계정입니다. 이메일로 찾을 수 있습니다."
          >
            <Input placeholder="uid 또는 email@example.com" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={previewMutation.isPending}>
            미리보기
          </Button>
        </Form>
      </Card>

      {preview && (
        <Card title="미리보기" style={{ maxWidth: 720, marginTop: 24 }}>
          <Descriptions
            title="Target (유지되는 유저)"
            column={1}
            size="small"
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="UID">{preview.target.uid}</Descriptions.Item>
            <Descriptions.Item label="이름">{preview.target.name || "-"}</Descriptions.Item>
            <Descriptions.Item label="이메일">{preview.target.email}</Descriptions.Item>
            <Descriptions.Item label="현재 로그인 수단">
              <ProviderTags providers={preview.target.firebase_providers} />
            </Descriptions.Item>
          </Descriptions>

          <Descriptions
            title="Source (로그인 수단을 넘겨줄 새 계정 — 이관 시 삭제됨)"
            column={1}
            size="small"
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="UID">{preview.source.uid}</Descriptions.Item>
            <Descriptions.Item label="이메일">{preview.source.email ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="로그인 수단">
              <ProviderTags providers={preview.source.firebase_providers} />
            </Descriptions.Item>
            {preview.source.db_row && (
              <Descriptions.Item label="가입된 계정 데이터">
                가입 {preview.source.db_row.joined_at
                  ? dayjs(preview.source.db_row.joined_at).format("YYYY-MM-DD HH:mm")
                  : "-"}{" "}
                · tasks {preview.source.db_row.counts.tasks} · devices{" "}
                {preview.source.db_row.counts.devices} · integrations{" "}
                {preview.source.db_row.counts.integrations}
              </Descriptions.Item>
            )}
          </Descriptions>

          {preview.provider_to_link && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={
                <>
                  이관 후 로그인 수단:{" "}
                  <Tag color={preview.provider_to_link.provider_id === "google.com" ? "blue" : "default"}>
                    {preview.provider_to_link.provider_id}
                  </Tag>
                  {preview.provider_to_link.email ?? ""}
                </>
              }
            />
          )}

          {preview.blockers.length > 0 && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message="이관할 수 없습니다"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {preview.blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              }
            />
          )}

          {preview.warnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="이관 시 다음이 함께 적용됩니다"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {preview.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              }
            />
          )}

          <Popconfirm
            title="정말 이관할까요?"
            description="되돌릴 수 없습니다. source 계정은 삭제되고 유저는 새 계정으로 다시 로그인해야 합니다."
            okText="이관"
            cancelText="취소"
            okButtonProps={{ danger: true }}
            onConfirm={() => migrateMutation.mutate()}
          >
            <Button
              danger
              type="primary"
              disabled={preview.blockers.length > 0}
              loading={migrateMutation.isPending}
            >
              이관 실행
            </Button>
          </Popconfirm>
        </Card>
      )}

      {result && (
        <Alert
          type="success"
          showIcon
          style={{ maxWidth: 720, marginTop: 24 }}
          message="이관이 완료되었습니다"
          description={
            <Space direction="vertical" size={4}>
              <span>
                {result.target.email} — {result.previous_provider ?? "?"} →{" "}
                <b>{result.linked_provider.provider_id}</b>
                {result.deleted_source_row ? " (source 고아 계정 삭제됨)" : ""}
              </span>
              <span>유저는 다음 로그인부터 새 계정을 사용합니다.</span>
              <Button size="small" onClick={() => navigate(`/users/${result.target.uid}`)}>
                유저 상세로 이동
              </Button>
            </Space>
          }
        />
      )}
    </>
  );
}

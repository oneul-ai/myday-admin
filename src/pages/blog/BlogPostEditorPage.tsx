import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { ArrowLeftOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import MDEditor, { commands, type ICommand } from "@uiw/react-md-editor";
import {
  createBlogPost,
  getBlogPost,
  updateBlogPost,
  uploadBlogImage,
  type BlogPostInput,
  type BlogPostStatus,
} from "../../api/blogPosts";

// i18n Keys 페이지와 같은 표시 순서.
const LOCALES: { code: string; label: string }[] = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh-Hans", label: "中文(简体)" },
  { code: "zh-Hant", label: "中文(繁體)" },
];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // 파일 선택 창을 취소하면 change 가 안 오지만, 페이지를 떠나면 GC 된다.
    input.click();
  });
}

interface FormValues {
  slug: string;
  titles: Record<string, string>;
  bodies: Record<string, string>;
  descriptions: Record<string, string>;
}

export default function BlogPostEditorPage() {
  const { id } = useParams<{ id: string }>();
  const postId = id ? Number(id) : null;
  const isNew = postId === null;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverTouched, setCoverTouched] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", postId],
    queryFn: () => getBlogPost(postId!),
    enabled: postId !== null,
  });

  // 저장 전 커버 변경이 없으면 서버 값을 그대로 표시한다.
  const effectiveCover = coverTouched ? coverUrl : (post?.cover_image_url ?? null);

  const saveMutation = useMutation({
    mutationFn: async ({ status }: { status: BlogPostStatus }) => {
      const values = await form.validateFields();
      const body: BlogPostInput = {
        slug: values.slug,
        titles: values.titles ?? {},
        bodies: values.bodies ?? {},
        descriptions: values.descriptions ?? {},
        cover_image_url: effectiveCover,
        status,
      };
      return isNew ? createBlogPost(body) : updateBlogPost(postId!, body);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.setQueryData(["blog-post", saved.id], saved);
      if (saved.status === "published") {
        message.success("발행되었습니다. 사이트 반영은 목록의 '사이트 배포' 버튼을 눌러주세요.");
      } else {
        message.success("저장되었습니다.");
      }
      if (isNew) navigate(`/blog-posts/${saved.id}`, { replace: true });
    },
    onError: (err: unknown) => {
      if ((err as { errorFields?: unknown }).errorFields) return; // 폼 검증 실패는 필드에 표시됨
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail ?? "저장 실패");
    },
  });

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    try {
      const { url } = await uploadBlogImage(file);
      setCoverUrl(url);
      setCoverTouched(true);
    } catch {
      message.error("커버 이미지 업로드 실패");
    } finally {
      setCoverUploading(false);
    }
    return false; // antd 자동 업로드 방지
  };

  // MDEditor 툴바 커맨드 — 파일을 골라 GCS 에 올리고 커서 위치에 마크다운을 삽입.
  const uploadImageCommand: ICommand = useMemo(
    () => ({
      name: "upload-image",
      keyCommand: "upload-image",
      buttonProps: { "aria-label": "이미지 업로드", title: "이미지 업로드" },
      icon: <PictureOutlined />,
      execute: (_state, api) => {
        void (async () => {
          const file = await pickImageFile();
          if (!file) return;
          const hide = message.loading("이미지 업로드 중…", 0);
          try {
            const { url } = await uploadBlogImage(file);
            api.replaceSelection(`![](${url})`);
          } catch {
            message.error("이미지 업로드 실패");
          } finally {
            hide();
          }
        })();
      },
    }),
    [],
  );

  if (!isNew && isLoading) {
    return <Spin style={{ display: "block", margin: "80px auto" }} />;
  }

  const localeTabs = LOCALES.map(({ code, label }) => ({
    key: code,
    label:
      code === "ko" ? (
        <span>
          {label} <Tag color="red">필수</Tag>
        </span>
      ) : (
        label
      ),
    // 탭 전환 시 폼 값이 유지되도록 forceRender.
    forceRender: true,
    children: (
      <>
        <Form.Item
          label="제목"
          name={["titles", code]}
          rules={code === "ko" ? [{ required: true, message: "한국어 제목은 필수입니다." }] : []}
        >
          <Input placeholder={`${label} 제목`} maxLength={200} />
        </Form.Item>
        <Form.Item
          label="요약 (SEO description)"
          name={["descriptions", code]}
          extra="검색 결과·목록에 노출되는 1~2문장 요약"
        >
          <Input.TextArea rows={2} maxLength={300} />
        </Form.Item>
        <Form.Item label="본문 (마크다운)" name={["bodies", code]}>
          <MDEditor
            height={480}
            preview="live"
            commands={[...commands.getCommands(), uploadImageCommand]}
          />
        </Form.Item>
      </>
    ),
  }));

  return (
    <div data-color-mode="light">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/blog-posts")}>
          목록
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {isNew ? "새 글 작성" : "글 수정"}
        </Typography.Title>
        {post?.status === "published" && <Tag color="green">published</Tag>}
        {post?.status === "draft" && <Tag color="gold">draft</Tag>}
      </Space>

      <Form<FormValues>
        key={post ? `post-${post.id}-${post.updated_at}` : "new"}
        form={form}
        layout="vertical"
        initialValues={
          post
            ? {
                slug: post.slug,
                titles: post.titles,
                bodies: post.bodies,
                descriptions: post.descriptions,
              }
            : { titles: {}, bodies: {}, descriptions: {} }
        }
      >
        <Card style={{ marginBottom: 16 }}>
          <Form.Item
            label="Slug (URL 경로)"
            name="slug"
            extra="예: my-first-post → myday.now/blog/my-first-post. 발행 후 변경하면 기존 URL 이 깨집니다."
            rules={[
              { required: true, message: "slug 는 필수입니다." },
              {
                pattern: SLUG_RE,
                message: "소문자·숫자·하이픈만 사용할 수 있습니다 (예: my-first-post).",
              },
            ]}
          >
            <Input placeholder="my-first-post" maxLength={200} style={{ maxWidth: 400 }} />
          </Form.Item>

          <Form.Item label="커버 이미지 (og:image, 목록 썸네일)">
            <Space align="start">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleCoverUpload}
              >
                <Button icon={<UploadOutlined />} loading={coverUploading}>
                  업로드
                </Button>
              </Upload>
              {effectiveCover && (
                <Space align="start">
                  <img
                    src={effectiveCover}
                    alt="cover"
                    style={{ maxHeight: 80, borderRadius: 4, display: "block" }}
                  />
                  <Button
                    size="small"
                    onClick={() => {
                      setCoverUrl(null);
                      setCoverTouched(true);
                    }}
                  >
                    제거
                  </Button>
                </Space>
              )}
            </Space>
          </Form.Item>
        </Card>

        <Card>
          <Tabs items={localeTabs} />
        </Card>
      </Form>

      <Space style={{ marginTop: 16 }}>
        <Button
          loading={saveMutation.isPending && saveMutation.variables?.status === "draft"}
          onClick={() => saveMutation.mutate({ status: "draft" })}
        >
          임시저장
        </Button>
        <Popconfirm
          title="발행할까요?"
          description="제목과 본문이 모두 있는 언어에만 노출됩니다. 사이트 반영은 별도 배포가 필요합니다."
          onConfirm={() => saveMutation.mutate({ status: "published" })}
        >
          <Button
            type="primary"
            loading={saveMutation.isPending && saveMutation.variables?.status === "published"}
          >
            발행
          </Button>
        </Popconfirm>
      </Space>
    </div>
  );
}

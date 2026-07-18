import client from "./client";

export type BlogPostStatus = "draft" | "published";

export interface BlogPost {
  id: number;
  slug: string;
  titles: Record<string, string>;
  // 마크다운 원문. 웹사이트 빌드 시점에 HTML 로 변환된다.
  bodies: Record<string, string>;
  descriptions: Record<string, string>;
  cover_image_url: string | null;
  status: BlogPostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostsResponse {
  total: number;
  supported_locales: string[];
  items: BlogPost[];
}

export interface BlogPostInput {
  slug?: string;
  titles?: Record<string, string>;
  bodies?: Record<string, string>;
  descriptions?: Record<string, string>;
  cover_image_url?: string | null;
  status?: BlogPostStatus;
}

export async function getBlogPosts(params?: {
  status?: BlogPostStatus;
  q?: string;
  offset?: number;
  limit?: number;
}) {
  const { data } = await client.get<BlogPostsResponse>("/posts", { params });
  return data;
}

export async function getBlogPost(id: number) {
  const { data } = await client.get<BlogPost>(`/posts/${id}`);
  return data;
}

export async function createBlogPost(body: BlogPostInput) {
  const { data } = await client.post<BlogPost>("/posts", body);
  return data;
}

export async function updateBlogPost(id: number, body: BlogPostInput) {
  const { data } = await client.patch<BlogPost>(`/posts/${id}`, body);
  return data;
}

export async function deleteBlogPost(id: number) {
  await client.delete(`/posts/${id}`);
}

export async function uploadBlogImage(file: File) {
  const fd = new FormData();
  fd.append("image", file);
  const { data } = await client.post<{ url: string }>("/posts/images", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// 발행된 글로 마케팅 사이트(myday-web)를 재빌드한다 (GitHub Actions 트리거).
export async function deploySite() {
  const { data } = await client.post<{ ok: boolean }>("/site/deploy");
  return data;
}

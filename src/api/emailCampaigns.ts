import client from "./client";

export type EmailCampaignStatus = "draft" | "sending" | "sent" | "failed";

export interface AudiencePreview {
  total: number;
  named: number;
  noname: number;
  // noname 유저가 있는데 noname 템플릿이 없어 발송에서 제외되는 경우 true
  noname_will_be_skipped: boolean;
}

export interface PostmarkBulkEntry {
  template_alias: string;
  bulk_id: number | string;
  count: number;
}

export interface PostmarkBulkStatus extends PostmarkBulkEntry {
  status: string;
  total_messages: number | null;
  percentage_completed: number | null;
}

export interface EmailCampaign {
  id: number;
  template_alias: string;
  noname_template_alias: string | null;
  // name 을 제외한 공통 템플릿 변수 (preheader, app_link 등)
  template_model: Record<string, string>;
  marketing_agreed_only: boolean;
  // 가입 시각 범위 필터 (양끝 포함, ISO datetime). null 은 해당 방향 제한 없음.
  joined_after: string | null;
  joined_before: string | null;
  status: EmailCampaignStatus;
  recipient_count: number | null;
  postmark_bulk_ids: PostmarkBulkEntry[] | null;
  error: string | null;
  created_by: string;
  created_at: string;
  sent_at: string | null;
  // 상태별 부가 필드 (서버가 조건부로 내려줌)
  audience_preview?: AudiencePreview;
  postmark_statuses?: PostmarkBulkStatus[];
  postmark_error?: string;
  progress?: number;
  noname_skipped_count?: number;
}

export interface EmailCampaignsResponse {
  total: number;
  items: EmailCampaign[];
}

export interface EmailCampaignInput {
  template_alias?: string;
  noname_template_alias?: string | null;
  template_model?: Record<string, string>;
  marketing_agreed_only?: boolean;
  joined_after?: string | null;
  joined_before?: string | null;
}

export async function getEmailCampaigns(params?: { offset?: number; limit?: number }) {
  const { data } = await client.get<EmailCampaignsResponse>("/email-campaigns", { params });
  return data;
}

export async function getEmailCampaign(id: number) {
  const { data } = await client.get<EmailCampaign>(`/email-campaigns/${id}`);
  return data;
}

export async function createEmailCampaign(body: EmailCampaignInput) {
  const { data } = await client.post<EmailCampaign>("/email-campaigns", body);
  return data;
}

export async function updateEmailCampaign(id: number, body: EmailCampaignInput) {
  const { data } = await client.patch<EmailCampaign>(`/email-campaigns/${id}`, body);
  return data;
}

export async function deleteEmailCampaign(id: number) {
  await client.delete(`/email-campaigns/${id}`);
}

// 실발송. draft 캠페인에만 허용되며 서버가 draft → sending 전이를 원자적으로
// 선점하므로 중복 클릭이 이중 발송으로 이어지지 않는다 (두 번째 요청은 409).
export async function sendEmailCampaign(id: number) {
  const { data } = await client.post<EmailCampaign>(`/email-campaigns/${id}/send`);
  return data;
}

export interface SuppressionSyncResult {
  stream: string;
  // dump 에서 받아온 활성 suppression 수
  total: number;
  // 이번 동기화로 새로 등록된 수
  added: number;
  // dump 에 없어 해제 처리된 로컬 row 수
  released: number;
  // 마케팅 수신동의가 꺼진 계정 수 (ManualSuppression + Recipient 만 해당)
  marketing_synced: number;
}

// Postmark suppression(수신거부/바운스/스팸신고) 전량 동기화.
// 평상시엔 웹훅이 실시간 반영하므로, 웹훅 유실 보정이나 최초 백필용.
export async function syncSuppressions() {
  const { data } = await client.post<SuppressionSyncResult>(
    "/email-campaigns/suppressions/sync",
  );
  return data;
}

export async function sendTestEmail(
  id: number,
  body: { to: string; variant?: "named" | "noname"; name?: string },
) {
  const { data } = await client.post<{ ok: boolean; template_alias: string; to: string }>(
    `/email-campaigns/${id}/test`,
    body,
  );
  return data;
}

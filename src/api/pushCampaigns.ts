import client from "./client";

// CRM 앱 푸시 캠페인 — 앱에는 푸시 타입 `marketing` 으로 나간다.
// draft 에서만 수정·삭제할 수 있고, 예약을 고치려면 예약 취소(→ draft)부터 한다.
export type PushCampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "canceled";

// 문구 언어. ko 가 원문(필수)이고 나머지는 AI 번역 초안을 검수해 채운다.
// 수신 기기 언어는 서버가 발송 시점에 기기 앱 언어 → 타임존(국가) → en 순으로
// 정하며, 그 언어의 번역이 없으면 en → ko 로 폴백한다.
export type PushLocale = "ko" | "en" | "ja" | "zh-Hans" | "zh-Hant";
export const PUSH_LOCALES: PushLocale[] = ["ko", "en", "ja", "zh-Hans", "zh-Hant"];

export interface PushCopy {
  title: string;
  body: string;
}

export type PushLocalizations = Partial<Record<PushLocale, PushCopy>>;

// 수신 동의 기준 — 선택한 것을 전부 만족(AND)한 유저만 받는다. 빈 배열 = 전원.
export type ConsentRequirement = "marketing_agreed" | "feature_news" | "events_benefits";

// 발송 시각 기준. absolute = scheduled_at 에 전원 동시,
// local = 유저 현지 시각이 scheduled_local_time 이 된 타임존부터 차례로.
export type ScheduleBasis = "absolute" | "local";

export interface PushAudiencePreview {
  users: number;
  devices: number;
  // 언어별 기기 수 (자동 배정 결과).
  by_locale: Record<PushLocale, number>;
  // 대상은 있는데 번역이 없어 en → ko 로 폴백되는 언어.
  fallback_locales: PushLocale[];
  // 타임존별 기기 수 (많은 순). "" 는 타임존 미설정 — 현지 시각 판정은 Asia/Seoul.
  by_timezone: Record<string, number>;
}

export interface PushCampaign {
  id: number;
  name: string;
  localizations: PushLocalizations;
  deeplink: string | null;
  consent_requirements: ConsentRequirement[];
  schedule_basis: ScheduleBasis;
  // absolute: 발송 시각. local: 가장 이른 타임존(UTC+14)의 발송 시각.
  scheduled_at: string | null;
  // local 전용 현지 벽시계 시각 "YYYY-MM-DDTHH:MM".
  scheduled_local_time: string | null;
  // local 전용: 이미 처리한 타임존.
  dispatched_timezones: string[];
  status: PushCampaignStatus;
  // 실제 발행한 유저·기기 수 (local 은 타임존이 나갈 때마다 누적).
  recipient_count: number;
  device_count: number;
  error: string | null;
  created_by: string;
  created_at: string;
  sent_at: string | null;
  // 발송 전·진행 중에만 서버가 내려준다.
  audience_preview?: PushAudiencePreview;
}

export interface PushCampaignsResponse {
  total: number;
  items: PushCampaign[];
}

export interface PushCampaignInput {
  name?: string;
  localizations?: PushLocalizations;
  deeplink?: string | null;
  consent_requirements?: ConsentRequirement[];
  schedule_basis?: ScheduleBasis;
  scheduled_at?: string | null;
  scheduled_local_time?: string | null;
}

export async function getPushCampaigns(params?: { offset?: number; limit?: number }) {
  const { data } = await client.get<PushCampaignsResponse>("/push-campaigns", { params });
  return data;
}

export async function getPushCampaign(id: number) {
  const { data } = await client.get<PushCampaign>(`/push-campaigns/${id}`);
  return data;
}

export async function createPushCampaign(body: PushCampaignInput) {
  const { data } = await client.post<PushCampaign>("/push-campaigns", body);
  return data;
}

export async function updatePushCampaign(id: number, body: PushCampaignInput) {
  const { data } = await client.patch<PushCampaign>(`/push-campaigns/${id}`, body);
  return data;
}

export async function deletePushCampaign(id: number) {
  await client.delete(`/push-campaigns/${id}`);
}

// ko 원문 → en / ja / zh-Hans / zh-Hant AI 번역 초안. 저장되지 않는다.
export async function translatePushCopy(body: PushCopy) {
  const { data } = await client.post<{ localizations: PushLocalizations }>(
    "/push-campaigns/translate",
    body,
  );
  return data.localizations;
}

// 저장된 발송 시각으로 예약 (draft → scheduled).
export async function schedulePushCampaign(id: number) {
  const { data } = await client.post<PushCampaign>(`/push-campaigns/${id}/schedule`);
  return data;
}

// 예약 취소. scheduled → draft, local 기준 진행 중(sending)이면 → canceled.
export async function cancelPushCampaign(id: number) {
  const { data } = await client.post<PushCampaign>(`/push-campaigns/${id}/cancel`);
  return data;
}

// 예약과 무관하게 지금 전원 발송. 서버가 sending 을 원자적으로 선점하므로
// 중복 클릭이 이중 발송으로 이어지지 않는다 (두 번째 요청은 409).
export async function sendPushCampaign(id: number) {
  const { data } = await client.post<PushCampaign>(`/push-campaigns/${id}/send`);
  return data;
}

// 특정 유저의 활성 기기로 테스트 발송 (수신 동의 무시, 캠페인 상태는 안 바뀐다).
// locale 을 주면 그 언어 문구로 고정, 없으면 기기 언어 자동 판정.
export async function sendPushCampaignTest(
  id: number,
  body: { uid: string; locale?: PushLocale },
) {
  const { data } = await client.post<{ ok: boolean; devices: number }>(
    `/push-campaigns/${id}/test`,
    body,
  );
  return data;
}

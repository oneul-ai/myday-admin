import client from "./client";

/**
 * Google Play 구독 — 구매 토큰 1개당 1행(구독의 현재 상태). App Store 의 결제 원장(회차별 1행)과 달리
 * 회차 이력·매출 집계는 아직 없다. 구매 토큰은 서버가 내리지 않는다.
 */
export interface GooglePlayPurchase {
  id: number;
  user_uid: string;
  user_email: string | null;
  /** Play Console 의 구독 상품 id (예: myday_prod_plus). */
  product_id: string;
  /** 그 상품 안의 기본 요금제 id (예: myday-prod-plus-yearly) — 월간·연간·캠페인을 가르는 값. */
  base_plan_id: string | null;
  offer_id: string | null;
  /** free_trial 등 현재 기간의 오퍼 단계. Google 이 주지 않으면 null. */
  offer_phase: string | null;
  /** 서버 판정 상태 — active 만 PLUS. */
  status: string;
  /** Google 의 subscriptionState 원문. */
  subscription_state: string | null;
  plan: string;
  auto_renew: boolean;
  purchased_at: string;
  expires_at: string | null;
  grace_period_expires_at: string | null;
  on_hold_started_at: string | null;
  auto_resume_at: string | null;
  cancelled_at: string | null;
  revoked_at: string | null;
  acknowledged: boolean;
  is_test_purchase: boolean;
  /** ISO 3166-1 alpha-2 (예: KR). */
  region_code: string | null;
  latest_order_id: string | null;
  renewal_price_milliunits: number | null;
  renewal_currency: string | null;
  has_linked_purchase_token: boolean;
  trial_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GooglePlayPurchasesResponse {
  total: number;
  items: GooglePlayPurchase[];
}

export interface ListGooglePlayPurchasesParams {
  user_uid?: string;
  status?: string;
  test_purchase?: boolean;
  offset?: number;
  limit?: number;
}

export async function getGooglePlayPurchases(params: ListGooglePlayPurchasesParams = {}) {
  const { data } = await client.get<GooglePlayPurchasesResponse>("/google-play/purchases", { params });
  return data;
}

/** 서버 판정 상태 선택지 — 필터와 표기에 함께 쓴다. */
export const GOOGLE_PLAY_STATUS_OPTIONS = [
  { value: "active", label: "이용 중", color: "green" },
  { value: "pending", label: "결제 대기", color: "gold" },
  { value: "on_hold", label: "결제 보류", color: "orange" },
  { value: "paused", label: "일시중지", color: "orange" },
  { value: "cancelled", label: "결제 취소", color: "default" },
  { value: "expired", label: "만료", color: "default" },
  { value: "revoked", label: "환불", color: "red" },
  { value: "unknown", label: "알 수 없음", color: "default" },
] as const;

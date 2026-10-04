import client from "./client";

/**
 * App Store 결제 원장 — Apple transactionId 1건당 1행.
 * app_store_purchases(구독 현재 상태)와 달리 갱신·환불 회차별 이력이 남는다.
 * price_milliunits 는 유저 결제가(밀리단위, 세금 포함 스토어는 세금 포함)이며
 * Apple 수수료 차감 전 금액이다.
 */
export interface AppStoreTransaction {
  id: number;
  user_uid: string | null;
  original_transaction_id: string;
  transaction_id: string;
  web_order_line_item_id: string | null;
  product_id: string;
  plan: string;
  type: string | null;
  offer_type: number | null;
  price_milliunits: number | null;
  currency: string | null;
  storefront: string | null;
  storefront_id: string | null;
  environment: string | null; // Production / Sandbox
  purchased_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revocation_reason: number | null;
  source: "notification" | "fallback" | "backfill" | string;
  last_notification_type: string | null;
  last_notification_subtype: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionsResponse {
  total: number;
  items: AppStoreTransaction[];
}

export interface ListTransactionsParams {
  user_uid?: string;
  original_transaction_id?: string;
  environment?: string;
  offset?: number;
  limit?: number;
}

export async function getTransactions(params: ListTransactionsParams = {}) {
  const { data } = await client.get<TransactionsResponse>("/app-store/transactions", { params });
  return data;
}

export interface TransactionsSummaryRow {
  currency: string | null;
  storefront: string | null;
  count: number;
  gross_milliunits: number;
  refunded_count: number;
  refunded_milliunits: number;
  net_milliunits: number;
}

export interface TransactionsSummaryResponse {
  from: string;
  to: string;
  environment: string;
  rows: TransactionsSummaryRow[];
}

export async function getTransactionsSummary(params: {
  from?: string;
  to?: string;
  environment?: string;
}) {
  const { data } = await client.get<TransactionsSummaryResponse>(
    "/app-store/transactions/summary",
    { params },
  );
  return data;
}

export interface BackfillResult {
  lineages: number;
  fetched: number;
  created: number;
  updated: number;
  failed: string[];
}

/** Apple transaction history API 로 원장을 채운다 (멱등, super admin). 대상 생략 시 전체 구독 계열. */
export async function backfillTransactions(originalTransactionIds?: string[]) {
  const { data } = await client.post<BackfillResult>(
    "/app-store/transactions/backfill",
    originalTransactionIds ? { original_transaction_ids: originalTransactionIds } : {},
  );
  return data;
}

/**
 * 밀리단위 금액을 통화 표기로. Apple 의 price 는 통화 단위 × 1,000 이다
 * (예: 39000000 = ₩39,000, 3990 = $3.99). 통화를 모르면 숫자만.
 */
export function formatMilliunits(milliunits: number | null, currency: string | null): string {
  if (milliunits === null || milliunits === undefined) return "-";
  const amount = milliunits / 1_000;
  if (!currency) return amount.toLocaleString();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

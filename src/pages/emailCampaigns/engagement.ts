import type { EmailCampaign } from "../../api/emailCampaigns";

// 오픈율·클릭율의 분모 — Postmark 에 접수된 수신자 중 batch 통별 실패를 뺀 수.
// bulk 는 접수 후 실패를 통별로 알 수 없어 recipient_count 그대로 쓴다.
export function deliveredCount(campaign: EmailCampaign): number | null {
  if (campaign.recipient_count == null) return null;
  const failed = (campaign.postmark_bulk_ids ?? []).reduce((sum, e) => sum + (e.failed_count ?? 0), 0);
  return Math.max(campaign.recipient_count - failed, 0);
}

export function ratePercent(numerator: number, denominator: number | null): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function formatRate(numerator: number, denominator: number | null): string {
  const r = ratePercent(numerator, denominator);
  return r == null ? "—" : `${r}%`;
}

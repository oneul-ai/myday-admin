import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { ConsentRequirement, PushCampaignStatus } from "../../api/pushCampaigns";

dayjs.extend(utc);
dayjs.extend(timezone);

// absolute 기준 발송 시각은 브라우저 타임존과 무관하게 KST 로 입력·표시한다.
export const KST = "Asia/Seoul";

export const STATUS_META: Record<PushCampaignStatus, { label: string; color: string }> = {
  draft: { label: "draft", color: "gold" },
  scheduled: { label: "예약됨", color: "purple" },
  sending: { label: "발송 중", color: "blue" },
  sent: { label: "발송 완료", color: "green" },
  failed: { label: "실패", color: "red" },
  canceled: { label: "취소됨", color: "default" },
};

export const CONSENT_OPTIONS: { value: ConsentRequirement; label: string; hint: string }[] = [
  {
    value: "marketing_agreed",
    label: "마케팅 수신 동의",
    hint: "가입 시(또는 설정에서) 마케팅 정보 수신에 동의한 유저",
  },
  {
    value: "feature_news",
    label: "알림 설정 · 새 기능 소식",
    hint: "앱 알림 설정의 '새 기능 소식' 토글이 켜진 유저",
  },
  {
    value: "events_benefits",
    label: "알림 설정 · 이벤트·혜택",
    hint: "앱 알림 설정의 '이벤트·혜택' 토글이 켜진 유저",
  },
];

export const CONSENT_LABELS = Object.fromEntries(
  CONSENT_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ConsentRequirement, string>;

export function errorDetail(err: unknown) {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === "string" ? detail : undefined;
}

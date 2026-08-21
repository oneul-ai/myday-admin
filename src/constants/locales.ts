// 언어별 오버라이드를 지원하는 locale — 서버(myday-api services/locale.py
// SUPPORTED_LOCALES)와 맞춰야 하며, 각 설정의 기본 언어는 목록에서 제외한다.

// 기본 언어가 한국어인 설정용 (인앱 메시지) — ko 제외.
export const OVERRIDE_LOCALES = [
  { code: "en", label: "영어 (en)" },
  { code: "ja", label: "일본어 (ja)" },
  { code: "zh-Hans", label: "중국어 간체 (zh-Hans)" },
  { code: "zh-Hant", label: "중국어 번체 (zh-Hant)" },
] as const;

// 지원 locale 전체의 표시 라벨 (기기 언어 등 읽기 전용 표시용).
export const LOCALE_LABELS: Record<string, string> = {
  ko: "한국어 (ko)",
  en: "영어 (en)",
  ja: "일본어 (ja)",
  "zh-Hans": "중국어 간체 (zh-Hans)",
  "zh-Hant": "중국어 번체 (zh-Hant)",
};

// 기본 언어가 영어인 설정용 (앱 링크) — en 제외.
export const OVERRIDE_LOCALES_EN_BASE = [
  { code: "ko", label: "한국어 (ko)" },
  { code: "ja", label: "일본어 (ja)" },
  { code: "zh-Hans", label: "중국어 간체 (zh-Hans)" },
  { code: "zh-Hant", label: "중국어 번체 (zh-Hant)" },
] as const;

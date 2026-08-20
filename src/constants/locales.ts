// 언어별 오버라이드를 지원하는 locale (ko 제외 — 기본값이 곧 한국어).
// 서버(myday-api services/locale.py SUPPORTED_LOCALES)와 맞춰야 한다.
export const OVERRIDE_LOCALES = [
  { code: "en", label: "영어 (en)" },
  { code: "ja", label: "일본어 (ja)" },
  { code: "zh-Hans", label: "중국어 간체 (zh-Hans)" },
  { code: "zh-Hant", label: "중국어 번체 (zh-Hant)" },
] as const;

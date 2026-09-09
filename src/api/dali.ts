import client from "./client";

export interface DaliModel {
  id: string;
  provider: "vertexai" | "openai";
  model: string;
  label: string;
}

export interface DaliProvidersResponse {
  models: DaliModel[];
  default_system_prompt: string;
  response_schema: Record<string, unknown>;
}

export async function getDaliProviders() {
  const { data } = await client.get<DaliProvidersResponse>("/dali/providers");
  return data;
}

export type DaliContext = Record<string, unknown>;

export async function getDaliContext(uid: string, timezone = "Asia/Seoul") {
  const { data } = await client.get<DaliContext>(`/dali/context/${uid}`, {
    params: { timezone },
  });
  return data;
}

export interface DaliFewShot {
  context: DaliContext;
  output: Record<string, unknown>;
}

export interface DaliRecommendRequest {
  context: DaliContext;
  model_id: string;
  system_prompt?: string;
  few_shot?: DaliFewShot[];
}

export interface DaliRecommendation {
  start_time: string;
  end_time: string;
  title: string;
  reason: string;
  estimated_minutes: number;
}

export interface DaliRecommendResponse {
  result: { recommendations: DaliRecommendation[] };
  latency_ms: number;
  messages_sent: { role: string; content: string }[];
  system_prompt_sent: string;
  model_id: string;
}

export async function recommendTasks(body: DaliRecommendRequest) {
  const { data } = await client.post<DaliRecommendResponse>(
    "/dali/recommend-tasks",
    body,
  );
  return data;
}

export interface DaliGreetingProvidersResponse {
  models: DaliModel[];
  default_system_prompt: string;
  response_schema: Record<string, unknown>;
}

export async function getDaliGreetingProviders() {
  const { data } = await client.get<DaliGreetingProvidersResponse>(
    "/dali/greeting/providers",
  );
  return data;
}

export async function getDaliGreetingContext(uid: string, timezone = "Asia/Seoul") {
  const { data } = await client.get<DaliContext>(`/dali/greeting/context/${uid}`, {
    params: { timezone },
  });
  return data;
}

export interface DaliGreetingResult {
  headline: string;
  sub_title: string;
  headline_reason?: string;
  sub_title_reason?: string;
}

export interface DaliRecommendGreetingRequest {
  context: DaliContext;
  model_id: string;
  system_prompt?: string;
  few_shot?: DaliFewShot[];
  thinking?: boolean;
  include_reason?: boolean;
}

export interface DaliRecommendGreetingResponse {
  result: DaliGreetingResult;
  latency_ms: number;
  messages_sent: { role: string; content: string }[];
  system_prompt_sent: string;
  model_id: string;
}

export async function recommendGreeting(body: DaliRecommendGreetingRequest) {
  const { data } = await client.post<DaliRecommendGreetingResponse>(
    "/dali/recommend-greeting",
    body,
  );
  return data;
}

export interface DaliQuoteProvidersResponse {
  models: DaliModel[];
  default_system_prompt: string;
  response_schema: Record<string, unknown>;
}

export async function getDaliQuoteProviders() {
  const { data } = await client.get<DaliQuoteProvidersResponse>(
    "/dali/quote/providers",
  );
  return data;
}

// 백엔드 QUOTE_LANGUAGES 와 동일한 코드 체계.
export const DALI_QUOTE_LANGUAGES = ["ko", "en", "ja", "zh-Hans", "zh-Hant"] as const;
export type DaliQuoteLanguage = (typeof DALI_QUOTE_LANGUAGES)[number];

// 명언 + 달이의 격려 메시지 — 요청 언어 하나로만 온다.
export interface DaliQuoteResult {
  quote: string;
  author: string;
  message: string;
}

export async function getDaliQuoteContext(
  uid: string,
  timezone = "Asia/Seoul",
  language: DaliQuoteLanguage = "en",
) {
  const { data } = await client.get<DaliContext>(`/dali/quote/context/${uid}`, {
    params: { timezone, language },
  });
  return data;
}

export interface DaliRecommendQuoteRequest {
  context: DaliContext;
  model_id: string;
  system_prompt?: string;
  few_shot?: DaliFewShot[];
  thinking?: boolean;
}

export interface DaliRecommendQuoteResponse {
  result: DaliQuoteResult;
  latency_ms: number;
  messages_sent: { role: string; content: string }[];
  system_prompt_sent: string;
  model_id: string;
}

export async function recommendQuote(body: DaliRecommendQuoteRequest) {
  const { data } = await client.post<DaliRecommendQuoteResponse>(
    "/dali/recommend-quote",
    body,
  );
  return data;
}

// ── 사주 기반 오늘의 운세 테스트 ──────────────────────────────────

export interface FortuneProvidersResponse {
  model_id: string; // 에디터(2단계) 기본 모델
  brief_model_id: string; // 브리프(1단계) 기본 모델
  models: DaliModel[]; // 어드민에서 고를 수 있는 모델 (sol / luna)
  default_system_prompt: string; // 에디터 프롬프트 (기획 원문 + 형식 부록)
  default_brief_system_prompt: string; // 브리프 프롬프트
  response_schema: Record<string, unknown>;
  brief_schema: Record<string, unknown>;
}

export async function getFortuneProviders() {
  const { data } = await client.get<FortuneProvidersResponse>("/dali/fortune/providers");
  return data;
}

// 서버가 결정론적으로 만든 사용자 컨텍스트 — 오늘 할 일·일정·생활 패턴·날씨의 장면 후보.
// 브리프 LLM 이 이 중 2~4개만 골라 오늘 테마와 엮는다. 어드민에서 편집해 보낼 수 있다.
export interface FortuneUserContext {
  date: string;
  timezone: string;
  profile: {
    weekday: string;
    summary: string | null;
    is_work_day: boolean | null;
    focus_times: string[];
    focus_varies: boolean;
    break_time: string | null;
    check_in_time: string | null;
    check_out_time: string | null;
    planning_pace: string | null;
  };
  today_scenes: string[];
  weather: {
    summary: string | null;
    city: string | null;
    condition: string | null;
    high: number | null;
    low: number | null;
    precipitation_chance: number | null;
    rain_expected: boolean;
    rain_from_hour: number | null;
    sunrise: string | null;
    sunset: string | null;
  } | null;
  time_overlap: string[];
  content_opportunities: string[];
  counts: { remaining_tasks: number; must_do: number; timed: number };
}

export interface FortuneContextResponse {
  profile: {
    uid: string;
    name: string | null;
    email: string | null;
    birth_date: string | null; // YYYY-MM-DD
    birth_time: string | null; // HH:MM
    birth_calendar: "solar" | "lunar" | "lunar_leap" | null;
    gender: "male" | "female" | null;
    timezone: string;
  };
  target_date: string;
  user_context: FortuneUserContext;
}

export async function getFortuneContext(uid: string, targetDate?: string) {
  const { data } = await client.get<FortuneContextResponse>(`/dali/fortune/context/${uid}`, {
    params: targetDate ? { target_date: targetDate } : undefined,
  });
  return data;
}

export interface FortuneTestRequest {
  model_id?: string; // 에디터 모델 오버라이드 (sol | luna). 없으면 서버 기본
  brief_model_id?: string; // 브리프 모델 오버라이드 (sol | luna). 없으면 서버 기본
  user_uid?: string; // 지정하면 생년월일·성별이 비면 프로필에서, user_context 가 비면 유저 데이터로 채움
  user_context?: FortuneUserContext; // 편집한 컨텍스트 (체인 실행 시 첫날 것 고정)
  birth_date?: string; // YYYY-MM-DD (user_uid 가 있으면 생략 가능)
  birth_time?: string | null; // HH:MM, 생시 미상이면 null
  birth_calendar?: "solar" | "lunar" | "lunar_leap"; // 기본 solar (음력이면 엔진이 양력 변환)
  gender?: "male" | "female"; // user_uid 가 있으면 생략 가능
  target_date?: string; // 기본: 오늘(KST)
  language?: string; // 기본: ko
  engine_only?: boolean; // true 면 LLM 없이 사주 엔진 입력만
  system_prompt?: string; // 에디터(2단계) 프롬프트 오버라이드 (언어 블록은 서버가 붙임)
  brief_system_prompt?: string; // 브리프(1단계) 프롬프트 오버라이드
  recent_fortunes?: FortuneHistoryEntry[]; // 첫날에 넘길 히스토리 (선택)
  chain_days?: number; // 1~7. 2 이상이면 하루씩 이어 생성하며 앞선 결과를 히스토리로 넘김
}

export interface FortuneScored {
  score: number; // 0~100
  message: string; // 1~2문장, 오늘의 장면 포함
}

// 기본 운세 카테고리 — 키·순서 고정 ("카테고리는 전통 운세처럼, 내용은 MyDay 처럼").
export const FORTUNE_CATEGORY_KEYS = ["work_study", "money", "love", "people", "health"] as const;
export type FortuneCategoryKey = (typeof FORTUNE_CATEGORY_KEYS)[number];
export const FORTUNE_CATEGORY_LABELS: Record<FortuneCategoryKey, string> = {
  work_study: "일·공부운",
  money: "재물운",
  love: "연애운",
  people: "대인운",
  health: "건강운",
};

export interface FortuneLuckyItem {
  kind: string; // 색/음식/시간/장소/물건/단어/행동 … 짧은 라벨
  value: string;
}

// 1단계(브리프) 출력 — 사주 엔진 데이터를 사주 용어 없이 번역한 오늘의 크리에이티브 브리프.
// 에디터(2단계)는 원시 사주 데이터 없이 이것만 보고 쓴다.
export interface FortuneBrief {
  user_context?: string; // 사용자의 오늘 한 줄 (컨텍스트 없으면 빈 문자열)
  today_scenes?: string[]; // 브리프가 고른 실제 장면 2~4개
  content_opportunities?: string[]; // 장면과 테마를 잇는 방법
  special_fortune_candidates?: string[]; // 오늘의 특별운 후보 (첫 번째가 1순위)
  core_theme: string;
  sub_theme: string;
  tension: string;
  permission: string;
  playful_angle: string;
  today_theme: string[];
  tone: Record<"opportunity" | "caution" | "social" | "focus", number>; // 0~1
  time: Record<"good" | "caution" | "rest", string>;
  motifs: string[];
  scene_pool: string[];
  colors: string[];
}

// 운세 payload — 2026-09 개편 후 형태. 개편 전 캐시는 이 페이지(어드민 테스트, 항상 새로
// 생성)에서는 오지 않는다.
export interface FortuneResult {
  headline: string; // 오늘의 한 줄 (총운 헤드라인)
  overall: FortuneScored; // 총운 점수 + 하루 전체 분위기 한 문장
  special: { name: string; stars: number; message: string }; // 오늘의 특별운 (별 1~5)
  categories: Record<FortuneCategoryKey, FortuneScored>; // 일·공부/재물/연애/대인/건강
  quest: { title: string; reason: string }; // 오늘의 퀘스트 (title 은 그대로 할 일 제목)
  dali_comment: string; // 달이의 한마디
  charm: string; // 오늘의 주문 (3~10글자)
  lucky_items: FortuneLuckyItem[]; // 럭키 아이템 3~5개
  compatibility: { good: string[]; caution: string[] }; // 오늘 잘 맞는/조심할 띠
  brief?: FortuneBrief; // 생성에 쓰인 브리프 (payload 에 함께 저장)
}

// 최근 운세 요약 — LLM 에 recent_fortunes 로 넘겨 반복을 피한다.
// 실서비스는 유저의 daily_fortunes 캐시 14일치에서 자동 수집한다.
export interface FortuneHistoryEntry {
  date: string;
  headline: string | null;
  overall?: string | null;
  special?: string | null; // 그날의 특별운 이름
  core_theme?: string | null;
  playful_angle?: string | null;
  card_names: string[];
  card_messages?: string[];
  quest: string | null;
  dali_comment?: string | null;
  lucky_items: string[];
  charm: string | null;
}

export interface FortunePillar {
  name: string; // 한글 간지, 예: 기사
  hanja: string; // 예: 己巳
}

// 유저에게 보여주는 운세 근거 — 검증 가능한 사실만 (원국·오늘 일진·오행 분포)
export interface FortuneBasis {
  natal_chart: {
    year_pillar: FortunePillar;
    month_pillar: FortunePillar;
    day_pillar: FortunePillar;
    hour_pillar: FortunePillar | null; // 생시 미상이면 null
    day_master: { name: string; hanja: string; element: string };
    zodiac_animal: string;
  };
  today: { name: string; hanja: string; cycle_index: number };
  five_elements: Record<"wood" | "fire" | "earth" | "metal" | "water", number>;
}

export interface FortuneTestRun {
  target_date: string;
  engine_input: Record<string, unknown>;
  basis: FortuneBasis;
  recent_fortunes: FortuneHistoryEntry[]; // 그날 LLM 에 넘긴 히스토리
  user_context: FortuneUserContext | null; // 그날 브리프에 넘긴 사용자 컨텍스트 (체인은 첫날 고정)
  brief: FortuneBrief | null; // 1단계 결과
  brief_latency_ms: number;
  fortune: FortuneResult | null;
  latency_ms: number; // 브리프 + 에디터 합산
}

export interface FortuneTestResponse {
  // 최상위 필드는 첫날(runs[0]) 결과. runs 에 chain_days 일치 전체가 날짜순으로 온다.
  engine_input: Record<string, unknown>;
  basis?: FortuneBasis;
  user_context?: FortuneUserContext | null;
  brief?: FortuneBrief | null;
  fortune: FortuneResult | null;
  model_id: string | null;
  brief_model_id?: string | null;
  latency_ms: number;
  runs?: FortuneTestRun[];
  system_prompt_sent?: string; // 실제 전송된 에디터 프롬프트 (언어 블록 포함)
  brief_system_prompt_sent?: string; // 실제 전송된 브리프 프롬프트
}

export async function testFortune(body: FortuneTestRequest) {
  const { data } = await client.post<FortuneTestResponse>(
    "/dali/fortune-test",
    body,
  );
  return data;
}

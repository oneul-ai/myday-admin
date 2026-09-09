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

export interface FortuneTestRequest {
  birth_date: string; // YYYY-MM-DD
  birth_time?: string | null; // HH:MM, 생시 미상이면 null
  birth_calendar?: "solar" | "lunar" | "lunar_leap"; // 기본 solar (음력이면 엔진이 양력 변환)
  gender: "male" | "female";
  target_date?: string; // 기본: 오늘(KST)
  language?: string; // 기본: ko
  engine_only?: boolean; // true 면 LLM 없이 사주 엔진 입력만
  recent_fortunes?: FortuneHistoryEntry[]; // 첫날에 넘길 히스토리 (선택)
  chain_days?: number; // 1~7. 2 이상이면 하루씩 이어 생성하며 앞선 결과를 히스토리로 넘김
}

export interface FortuneCard {
  topic: string; // 오늘 중요한 주제 (일/돈/사람/대화/휴식 … 날마다 다름)
  score: number; // 0~100
  message: string; // 1~2문장, 오늘의 장면 포함
}

export interface FortuneLuckyItem {
  kind: string; // 물건/음식/장소/시간/행동/단어/음악 … 짧은 라벨
  value: string;
}

// 운세 payload — 2026-09 개편 후 형태. 개편 전 캐시(categories/mission/lucky)는
// 이 페이지(어드민 테스트, 항상 새로 생성)에서는 오지 않는다.
export interface FortuneResult {
  character: string; // 오늘의 캐릭터 (예: 오늘의 협상가)
  headline: string;
  cards: FortuneCard[]; // 3~5개
  spotlight: { topic: string; line: string }; // cards 중 오늘 가장 특징적인 주제
  quest: { title: string; reason: string }; // 오늘의 퀘스트 (title 은 그대로 할 일 제목)
  dali_comment: string; // 달이의 한마디 (반말, 가장 자유로운 영역)
  lucky_items: FortuneLuckyItem[]; // 3~5개
  charm: string; // 오늘의 주문 (부적 문구)
  compatibility: { good: string[]; caution: string[] }; // 잘 맞는/조심할 띠
}

// 글쓰기 스타일 카드 — 날짜(60갑자 순번)·일간으로 결정되는 헤드라인 형식.
// 히스토리가 없는 첫날에도 헤드라인이 매일 다른 모양이 되게 하는 입력.
export interface FortuneWritingStyle {
  headline_form: string;
}

// 최근 운세 요약 — LLM 에 recent_fortunes 로 넘겨 반복을 피하고 연속성을 준다.
// 실서비스는 유저의 daily_fortunes 캐시 14일치에서 자동 수집한다.
export interface FortuneHistoryEntry {
  date: string;
  character: string | null;
  headline: string | null;
  spotlight: string | null;
  spotlight_line?: string | null;
  card_topics: string[];
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
  writing_style: FortuneWritingStyle;
  recent_fortunes: FortuneHistoryEntry[]; // 그날 LLM 에 넘긴 히스토리
  fortune: FortuneResult | null;
  latency_ms: number;
}

export interface FortuneTestResponse {
  // 최상위 필드는 첫날(runs[0]) 결과. runs 에 chain_days 일치 전체가 날짜순으로 온다.
  engine_input: Record<string, unknown>;
  basis?: FortuneBasis;
  writing_style?: FortuneWritingStyle;
  fortune: FortuneResult | null;
  model_id: string | null;
  latency_ms: number;
  runs?: FortuneTestRun[]; // 구버전 API 는 없음
}

export async function testFortune(body: FortuneTestRequest) {
  const { data } = await client.post<FortuneTestResponse>(
    "/dali/fortune-test",
    body,
  );
  return data;
}

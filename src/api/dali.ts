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

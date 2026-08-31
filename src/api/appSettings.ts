import client from "./client";

export interface AdSettings {
  my_tab: boolean;
  tab_bar: boolean;
  performance_tab: boolean;
  focus_tab: boolean;
}

export async function getAdSettings() {
  const { data } = await client.get<AdSettings>("/app-settings/ad");
  return data;
}

export async function updateAdSettings(body: Partial<AdSettings>) {
  const { data } = await client.put<AdSettings>("/app-settings/ad", body);
  return data;
}

/** 언어별 오버라이드 — 항목이 있으면 이미지·랜딩이 통째로 적용된다 (기본값과 섞지 않음). */
export interface MarketingInAppLocalization {
  image_url: string;
  landing_url: string | null;
}

/** 인앱 마케팅 캠페인 하나. 서버 리스트 순서가 곧 노출 우선순위다. */
export interface MarketingCampaign {
  /** 클라이언트가 노출/닫음 이력을 구분하는 식별자. 언어와 무관하게 하나. */
  id: string;
  enabled: boolean;
  /** 기본(한국어) 값 — 언어별 설정이 없는 언어에 폴백으로 내려간다. */
  image_url: string | null;
  landing_url: string | null;
  /** 언어별 오버라이드. key 는 ko 제외 지원 locale (en | ja | zh-Hans | zh-Hant). */
  localizations: Record<string, MarketingInAppLocalization>;
  /** 노출 조건 (null = 제한 없음). 서버가 /awake 시점에 평가한다. */
  min_app_version: string | null;
  max_app_version: string | null;
  /** ISO 8601 (offset 포함). 이 시각까지만 노출. */
  ends_at: string | null;
}

/** 서버 응답 — 우선순위 순 캠페인 리스트. 갱신/삭제도 전체 리스트를 돌려준다. */
export interface MarketingCampaignList {
  campaigns: MarketingCampaign[];
}

export async function getMarketingCampaigns() {
  const { data } = await client.get<MarketingCampaignList>(
    "/app-settings/marketing-in-app",
  );
  return data;
}

/** id 기준 부분 갱신 — 없으면 생성(맨 뒤에 추가). position(0-base)으로 우선순위 이동. */
export async function upsertMarketingCampaign(
  id: string,
  body: Partial<Omit<MarketingCampaign, "id">> & { position?: number },
) {
  const { data } = await client.put<MarketingCampaignList>(
    `/app-settings/marketing-in-app/${encodeURIComponent(id)}`,
    body,
  );
  return data;
}

export async function deleteMarketingCampaign(id: string) {
  const { data } = await client.delete<MarketingCampaignList>(
    `/app-settings/marketing-in-app/${encodeURIComponent(id)}`,
  );
  return data;
}

/** 인앱 마케팅 카드 이미지를 myday-api 를 통해 GCS 공개 버킷에 올리고 공개 URL 을 받는다. */
export async function uploadMarketingInAppImage(file: File) {
  const fd = new FormData();
  fd.append("image", file);
  const { data } = await client.post<{ url: string }>(
    "/app-settings/marketing-in-app/images",
    fd,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

/** 원격 설정 — /awake 의 remote_config 섹션으로 그대로 내려가는 key-value.
 * 값은 임의 JSON. key 는 언제든 삭제될 수 있으므로 클라이언트 계약상 항상 optional. */
export type RemoteConfig = Record<string, unknown>;

export async function getRemoteConfig() {
  const { data } = await client.get<RemoteConfig>("/app-settings/remote-config");
  return data;
}

/** 항목 추가/갱신 — 갱신된 전체 map 을 반환한다. */
export async function setRemoteConfigEntry(key: string, value: unknown) {
  const { data } = await client.put<RemoteConfig>(
    `/app-settings/remote-config/${encodeURIComponent(key)}`,
    { value },
  );
  return data;
}

export async function deleteRemoteConfigEntry(key: string) {
  const { data } = await client.delete<RemoteConfig>(
    `/app-settings/remote-config/${encodeURIComponent(key)}`,
  );
  return data;
}

/** 앱 링크 하나 — url 은 기본(한국어) 값, localizations 는 {locale: url} 오버라이드. */
export interface AppLinkSetting {
  url: string | null;
  localizations: Record<string, string>;
}

/** /awake 의 links 섹션으로 내려가는 앱 링크들 (이용가이드·업데이트 내역). */
export interface AppLinksSettings {
  usage_guide: AppLinkSetting;
  release_notes: AppLinkSetting;
}

export async function getAppLinksSettings() {
  const { data } = await client.get<AppLinksSettings>("/app-settings/links");
  return data;
}

export async function updateAppLinksSettings(body: Partial<AppLinksSettings>) {
  const { data } = await client.put<AppLinksSettings>(
    "/app-settings/links",
    body,
  );
  return data;
}

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

export interface MarketingInAppSetting {
  enabled: boolean;
  id: string | null;
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

export async function getMarketingInAppSetting() {
  const { data } = await client.get<MarketingInAppSetting>(
    "/app-settings/marketing-in-app",
  );
  return data;
}

export async function updateMarketingInAppSetting(
  body: Partial<MarketingInAppSetting>,
) {
  const { data } = await client.put<MarketingInAppSetting>(
    "/app-settings/marketing-in-app",
    body,
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

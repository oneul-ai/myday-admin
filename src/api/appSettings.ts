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

export interface MarketingInAppSetting {
  enabled: boolean;
  id: string | null;
  image_url: string | null;
  landing_url: string | null;
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

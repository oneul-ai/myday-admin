import client from "./client";

export interface AdSettings {
  my_tab: boolean;
  tab_bar: boolean;
  performance_tab: boolean;
}

export async function getAdSettings() {
  const { data } = await client.get<AdSettings>("/app-settings/ad");
  return data;
}

export async function updateAdSettings(body: Partial<AdSettings>) {
  const { data } = await client.put<AdSettings>("/app-settings/ad", body);
  return data;
}

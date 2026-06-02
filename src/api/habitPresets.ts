import client from "./client";

export interface HabitPreset {
  id: number;
  time_slot: string;
  emoji: string | null;
  focus_seconds: number | null;
  position: number;
  titles: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitPresetsResponse {
  total: number;
  supported_locales: string[];
  presets: HabitPreset[];
}

export interface HabitPresetCreateInput {
  time_slot: string;
  emoji?: string | null;
  focus_seconds?: number | null;
  titles: Record<string, string>;
  is_active?: boolean;
}

export interface HabitPresetUpdateInput {
  time_slot?: string;
  emoji?: string | null;
  focus_seconds?: number | null;
  titles?: Record<string, string>;
  is_active?: boolean;
}

export async function getHabitPresets(params?: {
  time_slot?: string;
  is_active?: boolean;
  offset?: number;
  limit?: number;
}) {
  const { data } = await client.get<HabitPresetsResponse>("/habit-presets", { params });
  return data;
}

export async function createHabitPreset(body: HabitPresetCreateInput) {
  const { data } = await client.post<HabitPreset>("/habit-presets", body);
  return data;
}

export async function updateHabitPreset(id: number, body: HabitPresetUpdateInput) {
  const { data } = await client.patch<HabitPreset>(`/habit-presets/${id}`, body);
  return data;
}

export async function deleteHabitPreset(id: number) {
  await client.delete(`/habit-presets/${id}`);
}

export async function reorderHabitPresets(time_slot: string, ordered_ids: number[]) {
  const { data } = await client.post<{ updated: number }>("/habit-presets/reorder", {
    time_slot,
    ordered_ids,
  });
  return data;
}

export interface HabitPresetAutofillResult {
  emoji: string | null;
  focus_seconds: number | null;
  titles: Record<string, string>;
}

export async function autofillHabitPreset(ko_title: string, time_slot?: string) {
  const { data } = await client.post<HabitPresetAutofillResult>(
    "/habit-presets/autofill",
    { ko_title, time_slot },
  );
  return data;
}

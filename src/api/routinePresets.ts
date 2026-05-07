import client from "./client";

export interface RoutinePreset {
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

export interface RoutinePresetsResponse {
  total: number;
  supported_locales: string[];
  presets: RoutinePreset[];
}

export interface RoutinePresetCreateInput {
  time_slot: string;
  emoji?: string | null;
  focus_seconds?: number | null;
  titles: Record<string, string>;
  is_active?: boolean;
}

export interface RoutinePresetUpdateInput {
  time_slot?: string;
  emoji?: string | null;
  focus_seconds?: number | null;
  titles?: Record<string, string>;
  is_active?: boolean;
}

export async function getRoutinePresets(params?: {
  time_slot?: string;
  is_active?: boolean;
  offset?: number;
  limit?: number;
}) {
  const { data } = await client.get<RoutinePresetsResponse>("/routine-presets", { params });
  return data;
}

export async function createRoutinePreset(body: RoutinePresetCreateInput) {
  const { data } = await client.post<RoutinePreset>("/routine-presets", body);
  return data;
}

export async function updateRoutinePreset(id: number, body: RoutinePresetUpdateInput) {
  const { data } = await client.patch<RoutinePreset>(`/routine-presets/${id}`, body);
  return data;
}

export async function deleteRoutinePreset(id: number) {
  await client.delete(`/routine-presets/${id}`);
}

export async function reorderRoutinePresets(time_slot: string, ordered_ids: number[]) {
  const { data } = await client.post<{ updated: number }>("/routine-presets/reorder", {
    time_slot,
    ordered_ids,
  });
  return data;
}

export interface RoutinePresetAutofillResult {
  emoji: string | null;
  focus_seconds: number | null;
  titles: Record<string, string>;
}

export async function autofillRoutinePreset(ko_title: string, time_slot?: string) {
  const { data } = await client.post<RoutinePresetAutofillResult>(
    "/routine-presets/autofill",
    { ko_title, time_slot },
  );
  return data;
}

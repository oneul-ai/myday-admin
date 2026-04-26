import client from "./client";

export interface RoutinePreset {
  id: number;
  time_slot: string;
  emoji: string | null;
  focus_minutes: number | null;
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

export interface RoutinePresetInput {
  time_slot: string;
  emoji?: string | null;
  focus_minutes?: number | null;
  position?: number;
  titles: Record<string, string>;
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

export async function createRoutinePreset(body: RoutinePresetInput) {
  const { data } = await client.post<RoutinePreset>("/routine-presets", body);
  return data;
}

export async function updateRoutinePreset(id: number, body: Partial<RoutinePresetInput>) {
  const { data } = await client.patch<RoutinePreset>(`/routine-presets/${id}`, body);
  return data;
}

export async function deleteRoutinePreset(id: number) {
  await client.delete(`/routine-presets/${id}`);
}

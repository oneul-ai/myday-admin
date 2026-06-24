import client from "./client";

export interface HabitPreset {
  id: number;
  job_type: string | null;
  time_slot: string;
  emoji: string | null;
  focus_seconds: number | null;
  position: number;
  titles: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // 이 습관을 등록한(Task.habit_preset_id) distinct 유저 수. 목록 조회 시에만 채워진다.
  user_count?: number;
}

export interface HabitPresetsResponse {
  total: number;
  supported_locales: string[];
  valid_job_types: string[];
  presets: HabitPreset[];
}

export interface HabitPresetCreateInput {
  job_type: string | null;
  time_slot: string;
  emoji?: string | null;
  focus_seconds?: number | null;
  titles: Record<string, string>;
  is_active?: boolean;
}

export interface HabitPresetUpdateInput {
  job_type?: string | null;
  time_slot?: string;
  emoji?: string | null;
  focus_seconds?: number | null;
  titles?: Record<string, string>;
  is_active?: boolean;
}

// `job_type=null` 센티넬을 사용해 공통 풀(NULL) 행만 필터링한다.
export type JobTypeFilter = string | "null";

export async function getHabitPresets(params?: {
  job_type?: JobTypeFilter;
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

// 공통 풀은 job_type=null 로 호출 — 서버에 "null" 센티넬로 전달한다.
export async function reorderHabitPresets(
  job_type: string | null,
  time_slot: string,
  ordered_ids: number[],
) {
  const { data } = await client.post<{ updated: number }>("/habit-presets/reorder", {
    job_type: job_type ?? "null",
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

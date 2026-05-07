import client from "./client";

export interface TaskRecommendation {
  id: number;
  job_type: string | null;
  time_slot: string;
  emoji: string | null;
  focus_seconds: number | null;
  titles: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskRecommendationsResponse {
  total: number;
  supported_locales: string[];
  valid_job_types: string[];
  valid_time_slots: string[];
  items: TaskRecommendation[];
}

export interface TaskRecommendationCreateInput {
  job_type: string | null;
  time_slot: string;
  emoji?: string | null;
  focus_seconds?: number | null;
  titles: Record<string, string>;
  is_active?: boolean;
}

export interface TaskRecommendationUpdateInput {
  job_type?: string | null;
  time_slot?: string;
  emoji?: string | null;
  focus_seconds?: number | null;
  titles?: Record<string, string>;
  is_active?: boolean;
}

// `job_type=null` sentinel을 사용해 공통 풀(NULL) 행만 필터링한다.
export type JobTypeFilter = string | "null";

export async function getTaskRecommendations(params?: {
  job_type?: JobTypeFilter;
  time_slot?: string;
  is_active?: boolean;
  offset?: number;
  limit?: number;
}) {
  const { data } = await client.get<TaskRecommendationsResponse>("/task-recommendations", {
    params,
  });
  return data;
}

export async function createTaskRecommendation(body: TaskRecommendationCreateInput) {
  const { data } = await client.post<TaskRecommendation>("/task-recommendations", body);
  return data;
}

export async function updateTaskRecommendation(
  id: number,
  body: TaskRecommendationUpdateInput,
) {
  const { data } = await client.patch<TaskRecommendation>(`/task-recommendations/${id}`, body);
  return data;
}

export async function deleteTaskRecommendation(id: number) {
  await client.delete(`/task-recommendations/${id}`);
}

export interface TaskRecommendationAutofillResult {
  emoji: string | null;
  focus_seconds: number | null;
  titles: Record<string, string>;
}

export async function autofillTaskRecommendation(ko_title: string, time_slot?: string) {
  const { data } = await client.post<TaskRecommendationAutofillResult>(
    "/task-recommendations/autofill",
    { ko_title, time_slot },
  );
  return data;
}

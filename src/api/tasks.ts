import client from "./client";

export interface Task {
  id: number;
  date: string;
  type: "integration" | "task";
  title: string;
  description: string | null;
  emoji: string | null;
  is_must_do: boolean;
  is_completed: boolean;
  status: "ACTIVE" | "CANCELED" | "ORIGINAL_DELETED";
  position: number;
  start_at: string | null;
  end_at: string | null;
  is_linked: boolean;
  is_repeat_task: boolean;
  is_commended_by_dali: boolean;
  external_event_id: number | null;
  repeat_task_id: number | null;
  habit_preset_id: number | null;
  created_at: string;
  updated_at: string;
}

export async function getUserTasks(uid: string, params?: { date?: string; offset?: number; limit?: number }) {
  const { data } = await client.get<Task[]>(`/users/${uid}/tasks`, { params });
  return data;
}

import client from "./client";

export interface Task {
  id: number;
  date: string;
  type: "SCHEDULED" | "ROUTINE" | "MANUAL";
  time_slot: string;
  scheduled_time: string | null;
  title: string;
  focus_seconds: number | null;
  emoji: string | null;
  is_must_do: boolean;
  is_completed: boolean;
  status: "ACTIVE" | "CANCELED" | "ORIGINAL_DELETED";
  position: number;
  created_by: string;
  device_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserTasks(uid: string, params?: { date?: string; offset?: number; limit?: number }) {
  const { data } = await client.get<Task[]>(`/users/${uid}/tasks`, { params });
  return data;
}

export async function updateTask(taskId: number, body: { title?: string; date?: string; time_slot?: string; is_completed?: boolean; position?: number }) {
  const { data } = await client.patch(`/tasks/${taskId}`, body);
  return data;
}

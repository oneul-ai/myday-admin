import client from "./client";

export interface RepeatTask {
  id: number;
  user_uid: string;
  anchor_task_id: number | null;
  // 콘텐츠 (anchor template Task)
  title: string;
  emoji: string | null;
  focus_seconds: number | null;
  time_slot: string;
  scheduled_time: string | null;
  // 반복 규칙 (RRULE)
  frequency: string;
  rrule_interval: number;
  by_weekday: number[] | null;
  by_monthday: number[] | null;
  by_setpos: number | null;
  count: number | null;
  until_date: string | null;
  start_date: string;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserRepeatTasks(
  uid: string,
  params?: {
    time_slot?: string;
    deleted?: boolean;
    offset?: number;
    limit?: number;
  },
) {
  const { data } = await client.get<RepeatTask[]>(`/users/${uid}/routines`, { params });
  return data;
}

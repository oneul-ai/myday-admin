import client from "./client";

export interface Routine {
  id: number;
  user_uid: string;
  title: string;
  emoji: string | null;
  focus_seconds: number | null;
  time_slot: string;
  scheduled_time: string | null;
  position: number;
  start_date: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserRoutines(
  uid: string,
  params?: {
    time_slot?: string;
    deleted?: boolean;
    offset?: number;
    limit?: number;
  },
) {
  const { data } = await client.get<Routine[]>(`/users/${uid}/routines`, { params });
  return data;
}

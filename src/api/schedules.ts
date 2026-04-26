import client from "./client";

export interface Schedule {
  id: number;
  type: string;
  provider: string;
  external_id: string;
  calendar_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  date: string | null;
  start_at: string | null;
  end_at: string | null;
  is_all_day: boolean;
  due_at: string | null;
  is_completed: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function getUserSchedules(
  uid: string,
  params?: {
    date?: string;
    provider?: string;
    type?: string;
    status?: string;
    is_completed?: boolean;
    offset?: number;
    limit?: number;
  },
) {
  const { data } = await client.get<Schedule[]>(`/users/${uid}/schedules`, { params });
  return data;
}

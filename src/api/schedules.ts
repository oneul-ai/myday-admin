import client from "./client";

export interface IntegrationExternalEvent {
  id: number;
  user_uid: string;
  integration_id: number;
  integration_external_calendar_id: number | null;
  event_id: string;
  provider: string;
  type: string;
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

export async function getUserEvents(
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
  const { data } = await client.get<IntegrationExternalEvent[]>(
    `/users/${uid}/schedules`,
    { params },
  );
  return data;
}

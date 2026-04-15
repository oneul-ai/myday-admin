import client from "./client";

export interface Calendar {
  user_uid: string;
  provider: string;
  id: string;
  summary: string;
  description: string | null;
  color: string | null;
  is_primary: boolean;
  access_role: string | null;
  status: string;
  subscribed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: number;
  provider: string;
  connection_type: string;
  status: string;
  connected_at: string;
  last_calendar_synced_at: string | null;
  last_events_synced_at: string | null;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserCalendars(uid: string, params?: { provider?: string }) {
  const { data } = await client.get<Calendar[]>(`/users/${uid}/calendars`, { params });
  return data;
}

export async function getUserIntegrations(uid: string) {
  const { data } = await client.get<Integration[]>(`/users/${uid}/integrations`);
  return data;
}

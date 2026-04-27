import client from "./client";

export interface User {
  uid: string;
  email: string;
  name: string;
  profile_image_url: string | null;
  terms_agreed: boolean;
  privacy_agreed: boolean;
  marketing_agreed: boolean;
  joined_at: string;
  last_signed_in_at: string;
  plan: string;
  last_city: string | null;
  last_timezone: string | null;
  last_modified_at: string;
  deleted_at: string | null;
  anonymized_at: string | null;
}

export interface UsersResponse {
  total: number;
  users: User[];
}

export async function getUsers(params: {
  q?: string;
  offset?: number;
  limit?: number;
  include_deleted?: boolean;
}) {
  const { data } = await client.get<UsersResponse>("/users", { params });
  return data;
}

export async function getUser(uid: string) {
  const { data } = await client.get<User>(`/users/${uid}`);
  return data;
}

export async function updateUser(uid: string, body: { name?: string; plan?: string }) {
  const { data } = await client.patch<User>(`/users/${uid}`, body);
  return data;
}

export interface UserPreferences {
  job_type?: string;
  work_days?: string[];
  daily_rhythm?: Record<string, unknown>;
  break_time?: string;
  planning_style?: string;
  rest_preferences?: unknown[];
  planning_time: string;
  planning_noti_enabled: boolean;
  planning_noti_type: string;
  reflection_time: string;
  reflection_noti_enabled: boolean;
  reflection_noti_type: string;
  last_modified_at?: string;
}

export async function getUserPreferences(uid: string) {
  const { data } = await client.get<UserPreferences | null>(`/users/${uid}/preferences`);
  return data;
}

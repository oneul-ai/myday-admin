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
}

export interface UsersResponse {
  total: number;
  users: User[];
}

export async function getUsers(params: { q?: string; offset?: number; limit?: number }) {
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

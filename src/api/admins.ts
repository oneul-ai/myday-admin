import client from "./client";

export interface Me {
  id: number | null;
  email: string;
  name: string;
  picture: string;
  role: "super_admin" | "admin";
  is_bootstrap: boolean;
}

export interface Admin {
  id: number;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  last_signed_in_at: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminsResponse {
  total: number;
  bootstrap_email: string;
  admins: Admin[];
}

export interface AdminInput {
  email: string;
  name?: string | null;
  role?: string;
  is_active?: boolean;
}

export async function getMe() {
  const { data } = await client.get<Me>("/me");
  return data;
}

export async function getAdmins(params?: {
  q?: string;
  role?: string;
  is_active?: boolean;
  offset?: number;
  limit?: number;
}) {
  const { data } = await client.get<AdminsResponse>("/admins", { params });
  return data;
}

export async function createAdmin(body: AdminInput) {
  const { data } = await client.post<Admin>("/admins", body);
  return data;
}

export async function updateAdmin(id: number, body: Partial<AdminInput>) {
  const { data } = await client.patch<Admin>(`/admins/${id}`, body);
  return data;
}

export async function deleteAdmin(id: number) {
  await client.delete(`/admins/${id}`);
}

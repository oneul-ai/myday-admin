import client from "./client";

export interface RestPreferenceOption {
  id: number;
  key: string;
  position: number;
  titles: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestPreferenceOptionsResponse {
  total: number;
  supported_locales: string[];
  options: RestPreferenceOption[];
}

export interface RestPreferenceOptionCreateInput {
  key: string;
  titles: Record<string, string>;
  is_active?: boolean;
}

export interface RestPreferenceOptionUpdateInput {
  key?: string;
  titles?: Record<string, string>;
  is_active?: boolean;
}

export async function getRestPreferenceOptions(params?: {
  is_active?: boolean;
  offset?: number;
  limit?: number;
}) {
  const { data } = await client.get<RestPreferenceOptionsResponse>(
    "/rest-preference-options",
    { params },
  );
  return data;
}

export async function createRestPreferenceOption(body: RestPreferenceOptionCreateInput) {
  const { data } = await client.post<RestPreferenceOption>(
    "/rest-preference-options",
    body,
  );
  return data;
}

export async function updateRestPreferenceOption(
  id: number,
  body: RestPreferenceOptionUpdateInput,
) {
  const { data } = await client.patch<RestPreferenceOption>(
    `/rest-preference-options/${id}`,
    body,
  );
  return data;
}

export async function deleteRestPreferenceOption(id: number) {
  await client.delete(`/rest-preference-options/${id}`);
}

export async function reorderRestPreferenceOptions(ordered_ids: number[]) {
  const { data } = await client.post<{ updated: number }>(
    "/rest-preference-options/reorder",
    { ordered_ids },
  );
  return data;
}

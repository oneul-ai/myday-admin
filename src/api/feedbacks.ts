import client from "./client";

export type FeedbackType = "FEATURE_REQUEST" | "OPINION" | "BUG_REPORT" | "OTHER";
export type FeedbackStatus = "open" | "in_progress" | "resolved" | "wontfix";

export interface Feedback {
  id: number;
  user_uid: string;
  user_email: string | null;
  user_name: string | null;
  type: FeedbackType;
  content: string;
  device_id: string | null;
  platform: string | null;
  app_version: string | null;
  build_number: string | null;
  os_version: string | null;
  device_model: string | null;
  locale: string | null;
  timezone: string | null;
  status: FeedbackStatus;
  created_at: string;
}

export interface FeedbacksResponse {
  total: number;
  feedbacks: Feedback[];
  allowed_statuses: FeedbackStatus[];
  types: FeedbackType[];
}

export interface ListFeedbacksParams {
  q?: string;
  status?: FeedbackStatus;
  type?: FeedbackType;
  offset?: number;
  limit?: number;
}

export async function getFeedbacks(params: ListFeedbacksParams) {
  const { data } = await client.get<FeedbacksResponse>("/feedbacks", { params });
  return data;
}

export async function getFeedback(id: number) {
  const { data } = await client.get<Feedback>(`/feedbacks/${id}`);
  return data;
}

export async function updateFeedback(id: number, body: { status?: FeedbackStatus }) {
  const { data } = await client.patch<Feedback>(`/feedbacks/${id}`, body);
  return data;
}

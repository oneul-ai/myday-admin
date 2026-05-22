import client from "./client";

export interface HourlyActivitySnapshot {
  window_start: string;
  window_end: string;
  active_users: number;
  signups: number;
  withdrawals: number;
  tasks_created: number;
  tasks_completed: number;
  check_ins: number;
  check_outs: number;
  updated_at: string;
}

export interface HourlySnapshotsResponse {
  from: string;
  to: string;
  items: HourlyActivitySnapshot[];
}

export interface ListHourlySnapshotsParams {
  from?: string;
  to?: string;
}

export async function getHourlySnapshots(params: ListHourlySnapshotsParams = {}) {
  const { data } = await client.get<HourlySnapshotsResponse>("/metrics/hourly", { params });
  return data;
}

import client from "./client";

export interface Device {
  id: number;
  device_id: string;
  fcm_token: string;
  platform: string;
  status: string;
  live_activity_start_token: string | null;
  // 실행 중인 Live Activity 의 활동별 업데이트 토큰 — 종료 테스트용
  live_activity_check_in_token: string | null;
  live_activity_check_out_token: string | null;
  // 카운트다운 카드의 업데이트 토큰과 대상 task id (종료 시 쌍으로 비워진다)
  live_activity_task_token: string | null;
  live_activity_task_id: number | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export type LiveActivityTestKind =
  | "check_in"
  | "check_out"
  | "task_countdown"
  | "check_in_end"
  | "check_out_end"
  | "task_countdown_end";

export async function getUserDevices(uid: string) {
  const { data } = await client.get<Device[]>(`/users/${uid}/devices`);
  return data;
}

export async function updateDevice(deviceId: number, body: { status: string }) {
  const { data } = await client.patch(`/devices/${deviceId}`, body);
  return data;
}

// push-to-start 토큰이 등록된 기기에 Live Activity 시작 푸시를 즉시 발행 (E2E 검증용)
export async function sendLiveActivityTest(deviceId: number, kind: LiveActivityTestKind) {
  const { data } = await client.post(`/devices/${deviceId}/live-activity-test`, { kind });
  return data;
}

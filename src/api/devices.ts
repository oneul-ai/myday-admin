import client from "./client";

export interface Device {
  id: number;
  device_id: string;
  fcm_token: string;
  platform: string;
  status: string;
  live_activity_start_token: string | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export type LiveActivityTestKind = "check_in" | "check_out" | "task_countdown";

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

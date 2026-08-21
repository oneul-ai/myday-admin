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
  // 잠금화면(Live Activity) 노출 설정 — 알림과 달리 유저가 아니라 기기 단위다.
  // null 은 '미설정'(토글을 만진 적 없거나 Live Activity 미사용 기기) = 켜짐 취급.
  live_activity_check_in_out_enabled: boolean | null;
  live_activity_task_enabled: boolean | null;
  // 기기의 앱 언어 — 저장 시 서버가 지원 locale(ko/en/ja/zh-Hans/zh-Hant) 하나로
  // 확정한다. null 은 미설정(구버전 클라이언트) = worker 발송 시 ko 폴백.
  language: string | null;
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

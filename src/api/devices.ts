import client from "./client";

export interface Device {
  id: number;
  device_id: string;
  fcm_token: string;
  platform: string;
  status: string;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export async function getUserDevices(uid: string) {
  const { data } = await client.get<Device[]>(`/users/${uid}/devices`);
  return data;
}

export async function updateDevice(deviceId: number, body: { status: string }) {
  const { data } = await client.patch(`/devices/${deviceId}`, body);
  return data;
}

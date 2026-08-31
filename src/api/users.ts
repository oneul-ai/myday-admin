import client from "./client";

export interface WeatherCurrent {
  cloudCover?: number | null;
  condition?: string | null;
  dewPoint?: number | null;
  feelsLike?: number | null;
  humidity?: number | null;
  isDaylight?: boolean | null;
  pressure?: number | null;
  pressureTrend?: string | null;
  symbolName?: string | null;
  temperature?: number | null;
  uvIndex?: number | null;
  visibility?: number | null;
  windDirection?: number | null;
  windGust?: number | null;
  windSpeed?: number | null;
}

export interface WeatherToday {
  condition?: string | null;
  date?: string | null;
  highTemperature?: number | null;
  lowTemperature?: number | null;
  precipitationAmount?: number | null;
  precipitationChance?: number | null;
  snowfallAmount?: number | null;
  sunrise?: string | null;
  sunset?: string | null;
  symbolName?: string | null;
  uvIndexMax?: number | null;
}

export interface WeatherLocation {
  locality?: string | null;
}

export interface WeatherSnapshot {
  current?: WeatherCurrent;
  today?: WeatherToday;
  location?: WeatherLocation;
  recordedAt?: string;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  provider: string | null;
  profile_image_url: string | null;
  terms_agreed: boolean;
  privacy_agreed: boolean;
  marketing_agreed: boolean;
  joined_at: string;
  last_signed_in_at: string;
  plan: string;
  /** 테스터 — 출시 전 기능 미리보기 대상. plan(과금)과 무관. */
  is_tester: boolean;
  last_city: string | null;
  last_timezone: string | null;
  last_weather_data: WeatherSnapshot | null;
  last_weather_updated_at: string | null;
  last_modified_at: string;
  last_routine_backfilled_at: string | null;
  last_schedule_backfilled_at: string | null;
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
  sort?: "joined_at" | "last_signed_in_at";
  order?: "asc" | "desc";
}) {
  const { data } = await client.get<UsersResponse>("/users", { params });
  return data;
}

export async function getUser(uid: string) {
  const { data } = await client.get<User>(`/users/${uid}`);
  return data;
}

export async function updateUser(
  uid: string,
  body: { name?: string; plan?: string; is_tester?: boolean },
) {
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
  check_in_time: string;
  check_in_noti_enabled: boolean;
  check_in_noti_type: string;
  check_out_time: string;
  check_out_noti_enabled: boolean;
  check_out_noti_type: string;
  task_noti_enabled: boolean;
  last_modified_at?: string;
}

export async function getUserPreferences(uid: string) {
  const { data } = await client.get<UserPreferences | null>(`/users/${uid}/preferences`);
  return data;
}

export interface UserNotificationSettings {
  check_in_enabled: boolean;
  check_in_type: string;
  check_out_enabled: boolean;
  check_out_type: string;
  task_noti_minutes: number[];
  task_at_start_enabled: boolean;
  task_before_5min_enabled: boolean;
  weekly_summary_enabled: boolean;
  feature_news_enabled: boolean;
  events_benefits_enabled: boolean;
  last_modified_at?: string;
}

export async function getUserNotificationSettings(uid: string) {
  const { data } = await client.get<UserNotificationSettings | null>(
    `/users/${uid}/notification-settings`,
  );
  return data;
}

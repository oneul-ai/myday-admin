export type ApiEnv = "dev" | "prod";

const STORAGE_KEY = "api_env";

const BASE_URLS: Record<ApiEnv, string> = {
  dev: import.meta.env.VITE_API_BASE_URL_DEV,
  prod: import.meta.env.VITE_API_BASE_URL_PROD,
};

export function getApiEnv(): ApiEnv {
  return localStorage.getItem(STORAGE_KEY) === "prod" ? "prod" : "dev";
}

export function setApiEnv(env: ApiEnv): void {
  localStorage.setItem(STORAGE_KEY, env);
}

export function getApiBaseUrl(): string {
  return BASE_URLS[getApiEnv()];
}

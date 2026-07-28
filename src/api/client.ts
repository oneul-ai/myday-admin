import axios from "axios";
import { getApiBaseUrl } from "./apiEnv";

const client = axios.create();

function isTokenExpired(token: string): boolean {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(base64)) as { exp?: number };
    return typeof exp === "number" && Date.now() >= exp * 1000;
  } catch {
    // Malformed — let the server reject so we don't loop on a bad cache.
    return false;
  }
}

function redirectToLogin() {
  localStorage.removeItem("admin_token");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

client.interceptors.request.use((config) => {
  config.baseURL = `${getApiBaseUrl()}/admin`;
  const token = localStorage.getItem("admin_token");
  if (!token) return config;
  if (isTokenExpired(token)) {
    redirectToLogin();
    return Promise.reject(new axios.Cancel("admin token expired"));
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      redirectToLogin();
    }
    return Promise.reject(error);
  },
);

export default client;

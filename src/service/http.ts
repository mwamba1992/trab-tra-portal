import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { Config } from '@/utils/Config';
import { accessToken, clearSession, refreshToken, saveSession, type ApiEnvelope, type AuthTokensResponse } from '@/service/session';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const http: AxiosInstance = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15000,
});

/** Bare instance (no interceptors) used only for the refresh call, so it can never recurse. */
const refreshClient: AxiosInstance = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15000,
});

type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler = () => {
  window.location.assign('/login?expired=1');
};

/** Registered by the router so http.ts does not import it (avoids a module cycle). */
export function setSessionExpiredHandler(fn: SessionExpiredHandler): void {
  sessionExpiredHandler = fn;
}

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.startsWith(Config.API_BASE_URL) ? url.slice(Config.API_BASE_URL.length) : url;
  return /^\/?auth\//.test(path);
}

let refreshInFlight: Promise<string> | null = null;

/** Single-flight refresh: concurrent callers share one request. Resolves to the new access token. */
function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    const token = refreshToken.value;
    refreshInFlight = (
      token
        ? refreshClient.post<ApiEnvelope<AuthTokensResponse>>('/auth/refresh', { refreshToken: token }).then((res) => {
            saveSession(res.data.data);
            return res.data.data.accessToken;
          })
        : Promise.reject(new Error('No refresh token'))
    ).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function expireSession(): void {
  clearSession();
  sessionExpiredHandler();
}

http.interceptors.request.use((config) => {
  const token = accessToken.value;
  if (token && !isAuthEndpoint(config.url)) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const original = error.config as RetriableConfig | undefined;

    // Login/refresh/etc. errors go straight to the caller (e.g. "Invalid credentials").
    if (error.response?.status !== 401 || !original || isAuthEndpoint(original.url)) {
      return Promise.reject(error);
    }
    if (original._retry) {
      expireSession();
      return Promise.reject(error);
    }

    original._retry = true;
    let newToken: string;
    try {
      newToken = await refreshAccessToken();
    } catch {
      expireSession();
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${newToken}`;
    return http(original);
  },
);

export default http;

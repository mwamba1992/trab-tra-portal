import { ref } from 'vue';

/** Session persistence for the TRA portal. Only these keys are ever touched in localStorage. */
export interface TraUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  permissions: string[];
}

/** `data` payload of POST /auth/tra/login and POST /auth/refresh. */
export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: TraUser;
}

/** Envelope returned by the backend (ApiResponse). */
export interface ApiEnvelope<T> {
  status: boolean;
  code: number;
  description: string;
  data: T;
}

const KEYS = {
  access: 'tra_access_token',
  refresh: 'tra_refresh_token',
  user: 'tra_user',
} as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function loadUser(): TraUser | null {
  const raw = read(KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TraUser;
  } catch {
    return null;
  }
}

// Reactive mirrors: localStorage is not reactive, so computed getters depend on these refs.
export const accessToken = ref<string | null>(read(KEYS.access));
export const refreshToken = ref<string | null>(read(KEYS.refresh));
export const currentUser = ref<TraUser | null>(loadUser());

export function saveSession(payload: AuthTokensResponse): void {
  localStorage.setItem(KEYS.access, payload.accessToken);
  localStorage.setItem(KEYS.refresh, payload.refreshToken);
  accessToken.value = payload.accessToken;
  refreshToken.value = payload.refreshToken;
  if (payload.user) {
    localStorage.setItem(KEYS.user, JSON.stringify(payload.user));
    currentUser.value = payload.user;
  }
}

export function clearSession(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  accessToken.value = null;
  refreshToken.value = null;
  currentUser.value = null;
}

/** Expiry (ms since epoch) of a JWT, or null when the token is missing/malformed. */
function tokenExpiry(token: string | null): number | null {
  if (!token) return null;
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload: unknown = JSON.parse(atob(padded));
    if (typeof payload !== 'object' || payload === null) return null;
    const exp = (payload as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True when the token decodes and has not expired (small skew margin). Malformed = expired. */
export function isTokenValid(token: string | null, skewMs = 5000): boolean {
  const exp = tokenExpiry(token);
  return exp !== null && exp - skewMs > Date.now();
}

/** The session is usable if the access token is valid, or it can be renewed with a valid refresh token. */
export function hasActiveSession(): boolean {
  return isTokenValid(accessToken.value) || isTokenValid(refreshToken.value);
}

import { defineStore } from 'pinia';
import { computed } from 'vue';
import http from '@/service/http';
import {
  accessToken,
  refreshToken,
  currentUser,
  saveSession,
  clearSession,
  isTokenValid,
  type ApiEnvelope,
  type AuthTokensResponse,
  type TraUser,
} from '@/service/session';

export type { TraUser } from '@/service/session';

export const useAuthStore = defineStore('auth', () => {
  const user = currentUser;

  /** Active if the access token is valid OR it can still be renewed with a valid refresh token. */
  const isAuthenticated = computed<boolean>(() => isTokenValid(accessToken.value) || isTokenValid(refreshToken.value));

  const fullName = computed(() => (user.value ? `${user.value.firstName} ${user.value.lastName}`.trim() : ''));
  const initials = computed(() => {
    if (!user.value) return 'TRA';
    return `${user.value.firstName?.[0] ?? ''}${user.value.lastName?.[0] ?? ''}`.toUpperCase();
  });
  const isAdmin = computed(() => user.value?.role === 'tra-admin');

  function can(permission: string): boolean {
    return user.value?.permissions?.includes(permission) ?? false;
  }

  async function login(email: string, password: string): Promise<TraUser> {
    const res = await http.post<ApiEnvelope<AuthTokensResponse>>('/auth/tra/login', { email, password });
    saveSession(res.data.data);
    return res.data.data.user;
  }

  function logout(): void {
    clearSession();
    // Full reload on sign-out so no in-memory state from the previous officer survives.
    window.location.assign('/login');
  }

  return { user, isAuthenticated, fullName, initials, isAdmin, can, login, logout };
});

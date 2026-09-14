import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http from '@/service/http';

export interface TraUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  permissions: string[];
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<TraUser | null>(loadUser());
  // Reactive mirror of the stored token. localStorage itself is NOT reactive,
  // so the computed below must depend on this ref to update after login/logout.
  const accessToken = ref<string | null>(localStorage.getItem('tra_access_token'));

  function loadUser(): TraUser | null {
    try {
      const raw = localStorage.getItem('tra_user');
      return raw ? (JSON.parse(raw) as TraUser) : null;
    } catch {
      return null;
    }
  }

  const isAuthenticated = computed(() => {
    const token = accessToken.value;
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  });

  const fullName = computed(() => (user.value ? `${user.value.firstName} ${user.value.lastName}`.trim() : ''));
  const initials = computed(() => {
    if (!user.value) return 'TRA';
    return `${user.value.firstName?.[0] ?? ''}${user.value.lastName?.[0] ?? ''}`.toUpperCase();
  });
  const isAdmin = computed(() => user.value?.role === 'tra-admin');

  function can(permission: string): boolean {
    if (!user.value) return false;
    return user.value.permissions?.includes(permission) ?? false;
  }

  async function login(email: string, password: string) {
    const res = await http.post('/auth/tra/login', { email, password });
    const { accessToken: token, refreshToken, user: u } = res.data.data;
    localStorage.setItem('tra_access_token', token);
    localStorage.setItem('tra_refresh_token', refreshToken);
    localStorage.setItem('tra_user', JSON.stringify(u));
    accessToken.value = token; // triggers isAuthenticated to recompute
    user.value = u;
    return u;
  }

  function logout() {
    localStorage.clear();
    accessToken.value = null;
    user.value = null;
    window.location.href = '/login';
  }

  return { user, isAuthenticated, fullName, initials, isAdmin, can, login, logout };
});

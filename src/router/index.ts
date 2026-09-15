import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { setSessionExpiredHandler } from '@/service/http';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    permission?: string;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'notices', name: 'Notices', component: () => import('@/views/Notices.vue') },
      { path: 'appeals', name: 'Appeals', component: () => import('@/views/Appeals.vue') },
      { path: 'appeals/:id', name: 'AppealDetail', component: () => import('@/views/AppealDetail.vue') },
      { path: 'applications', name: 'Applications', component: () => import('@/views/Applications.vue') },
      { path: 'summons', name: 'Summons', component: () => import('@/views/Summons.vue') },
      { path: 'decisions', name: 'Decisions', component: () => import('@/views/Decisions.vue') },
      { path: 'officers', name: 'Officers', component: () => import('@/views/Officers.vue'), meta: { permission: 'TRA Manage Users' } },
    ],
  },
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

/** A redirect target is safe only if it is a same-origin absolute path and not the login page. */
export function safeRedirect(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (/^\/login(?:[/?#]|$)/.test(raw)) return null;
  return raw;
}

setSessionExpiredHandler(() => {
  const current = router.currentRoute.value;
  if (current.path === '/login') return;
  const here = current.matched.length ? current.fullPath : `${window.location.pathname}${window.location.search}`;
  const redirect = safeRedirect(here);
  void router.push({ path: '/login', query: redirect ? { expired: '1', redirect } : { expired: '1' } });
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    const redirect = safeRedirect(to.fullPath);
    return { path: '/login', query: redirect && redirect !== '/dashboard' ? { redirect } : {} };
  }
  if (to.path === '/login' && auth.isAuthenticated) {
    return { path: safeRedirect(to.query.redirect) ?? '/dashboard' };
  }
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { path: '/dashboard' };
  }
  return true;
});

export default router;

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'appeals', name: 'Appeals', component: () => import('@/views/Appeals.vue') },
      { path: 'appeals/:id', name: 'AppealDetail', component: () => import('@/views/AppealDetail.vue') },
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

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login' };
  }
  if (to.path === '/login' && auth.isAuthenticated) {
    return { path: '/dashboard' };
  }
  if (to.meta.permission && !auth.can(to.meta.permission as string)) {
    return { path: '/dashboard' };
  }
  return true;
});

export default router;

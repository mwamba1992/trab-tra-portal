import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import { createRouter, createMemoryHistory } from 'vue-router';
import { saveSession, clearSession, type TraUser } from '@/service/session';
import { makeToken } from './tokens';

const Blank = { render: () => null };

/** Mounts a component with the portal's plugins (PrimeVue unstyled, Pinia, in-memory router). */
export async function mountWithApp(
  component: unknown,
  { props = {}, route = '/' }: { props?: Record<string, unknown>; route?: string } = {},
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/appeals', name: 'Appeals', component: Blank },
      { path: '/appeals/:id', name: 'AppealDetail', component: Blank },
      { path: '/:pathMatch(.*)*', name: 'Any', component: Blank },
    ],
  });
  await router.push(route);
  await router.isReady();

  const wrapper: VueWrapper = mount(component as never, {
    props: props as never,
    attachTo: document.body,
    global: {
      plugins: [pinia, [PrimeVue, { unstyled: true }], ToastService, ConfirmationService, router],
      directives: { tooltip: Tooltip },
      stubs: { teleport: true },
    },
  });
  await flushPromises();
  return { wrapper, router };
}

/** Signs in a test officer with the given permissions. */
export function signIn(permissions: string[], overrides: Partial<TraUser> = {}): TraUser {
  clearSession();
  const user: TraUser = {
    id: 'officer-1',
    firstName: 'Asha',
    lastName: 'Juma',
    email: 'asha@tra.go.tz',
    role: 'tra-admin',
    permissions,
    ...overrides,
  };
  saveSession({ accessToken: makeToken(600), refreshToken: makeToken(3600), user });
  return user;
}

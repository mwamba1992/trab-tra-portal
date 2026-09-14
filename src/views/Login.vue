<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/stores/auth';
import { safeRedirect } from '@/router';
import { apiErrorMessage } from '@/utils/errors';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const sessionExpired = computed(() => route.query.expired === '1');

function loginErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && !err.response) return 'Unable to reach the server. Check your connection and try again.';
  return apiErrorMessage(err, 'Sign in failed. Please try again.');
}

const submit = async (): Promise<void> => {
  if (loading.value) return;
  error.value = '';
  if (!email.value.trim() || !password.value) {
    error.value = 'Please enter both email and password.';
    return;
  }
  loading.value = true;
  try {
    await auth.login(email.value.trim(), password.value);
    await router.replace(safeRedirect(route.query.redirect) ?? '/dashboard');
  } catch (err: unknown) {
    error.value = loginErrorMessage(err);
    toast.add({ severity: 'error', summary: 'Login failed', detail: error.value, life: 5000 });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-wrap">
    <!-- Brand panel -->
    <div class="login-brand">
      <div class="brand-inner">
        <div class="flex items-center gap-3 mb-8">
          <div class="tra-emblem" style="width: 48px; height: 48px; font-size: 18px">TRA</div>
          <div class="text-white">
            <div class="text-2xl font-extrabold tracking-tight">IDRAS <span class="text-tra-yellow">Appeals</span></div>
            <div class="text-xs text-white/60 font-semibold mt-1">Tanzania Revenue Authority</div>
          </div>
        </div>
        <h2 class="text-white text-3xl font-extrabold leading-tight mb-4">Respondent<br />Case Portal</h2>
        <p class="text-white/70 text-sm leading-relaxed max-w-sm">
          Defend tax appeals filed before the Tax Revenue Appeals Board. File replies, exchange evidence, receive summons and decisions —
          end to end, fully digital.
        </p>
        <div class="mt-10 flex items-center gap-2 text-white/50 text-xs"><i class="pi pi-lock"></i> Authorised TRA officers only</div>
      </div>
    </div>

    <!-- Form panel -->
    <div class="login-form">
      <div class="w-full max-w-sm">
        <h1 class="text-2xl font-extrabold text-tra-black">Sign in</h1>
        <p class="text-sm text-tra-muted mt-1 mb-8">Use your TRA officer credentials.</p>

        <form class="flex flex-col gap-5" @submit.prevent="submit">
          <div v-if="sessionExpired && !error" class="login-notice" role="status">
            <i class="pi pi-clock"></i><span>Your session has expired. Please sign in again.</span>
          </div>
          <div v-if="error" class="login-error" role="alert">
            <i class="pi pi-exclamation-circle"></i><span>{{ error }}</span>
          </div>
          <div>
            <label for="login-email" class="block text-xs font-bold text-tra-ink mb-2">EMAIL ADDRESS</label>
            <div class="in-wrap">
              <i class="pi pi-envelope"></i>
              <input
                id="login-email"
                v-model="email"
                type="email"
                name="username"
                placeholder="officer@tra.go.tz"
                autocomplete="username"
                :disabled="loading"
                required
              />
            </div>
          </div>
          <div>
            <label for="login-password" class="block text-xs font-bold text-tra-ink mb-2">PASSWORD</label>
            <div class="in-wrap">
              <i class="pi pi-lock"></i>
              <input
                id="login-password"
                v-model="password"
                type="password"
                name="password"
                placeholder="••••••••"
                autocomplete="current-password"
                :disabled="loading"
                required
              />
            </div>
          </div>
          <button type="submit" class="tra-btn tra-btn-dark w-full justify-center h-11 mt-2" :disabled="loading" :aria-busy="loading">
            <i v-if="loading" class="pi pi-spin pi-spinner"></i>
            <span>{{ loading ? 'Signing in…' : 'Sign in' }}</span>
          </button>
        </form>
        <p class="text-xs text-tra-muted mt-8 text-center">© {{ new Date().getFullYear() }} Tanzania Revenue Authority · IDRAS Appeals</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrap {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  min-height: 100vh;
}
@media (max-width: 900px) {
  .login-wrap {
    grid-template-columns: 1fr;
  }
  .login-brand {
    display: none;
  }
}
.login-brand {
  background: radial-gradient(120% 120% at 0% 0%, #262626 0%, #141414 55%, #0c0c0c 100%);
  display: flex;
  align-items: center;
  padding: 48px;
  position: relative;
  overflow: hidden;
}
.login-brand::after {
  content: '';
  position: absolute;
  right: -80px;
  bottom: -80px;
  width: 320px;
  height: 320px;
  background: var(--tra-yellow);
  opacity: 0.12;
  border-radius: 50%;
}
.brand-inner {
  position: relative;
  z-index: 1;
}
.login-form {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--tra-surface);
}
.in-wrap {
  position: relative;
}
.in-wrap i {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--tra-muted);
  font-size: 14px;
}
.in-wrap input {
  width: 100%;
  height: 44px;
  padding: 0 14px 0 38px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.in-wrap input:focus {
  border-color: var(--tra-yellow);
  box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.25);
}
.login-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: #fffaeb;
  color: #93370d;
  border: 1px solid #fedf89;
}
.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: #fef3f2;
  color: #b42318;
  border: 1px solid #fecdca;
}
</style>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

defineProps<{ sidebarOpen: boolean; sidebarId: string }>();
defineEmits<{ (e: 'toggle-sidebar'): void }>();

const auth = useAuthStore();
</script>

<template>
  <header class="tra-topbar">
    <button
      type="button"
      class="tra-iconbtn tra-hamburger"
      :aria-label="sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'"
      :aria-expanded="sidebarOpen"
      :aria-controls="sidebarId"
      @click="$emit('toggle-sidebar')"
    >
      <i :class="sidebarOpen ? 'pi pi-times' : 'pi pi-bars'" aria-hidden="true"></i>
    </button>

    <router-link to="/dashboard" class="tra-brand" aria-label="IDRAS Appeals home">
      <span class="tra-emblem" aria-hidden="true">TRA</span>
      <span class="tra-wordmark">
        IDRAS<span class="badge">APPEALS</span>
        <span class="sub">Tanzania Revenue Authority</span>
      </span>
    </router-link>

    <span class="tra-modtab"><i class="pi pi-briefcase" aria-hidden="true"></i> Tax Appeals</span>

    <div class="tra-utility">
      <div class="tra-user-chip">
        <span class="tra-avatar" aria-hidden="true">{{ auth.initials }}</span>
        <div class="who">
          <div class="name">{{ auth.fullName }}</div>
          <div class="role">{{ auth.isAdmin ? 'TRA Administrator' : 'TRA Officer' }}</div>
        </div>
        <button v-tooltip.bottom="'Sign out'" type="button" class="tra-iconbtn" aria-label="Sign out" @click="auth.logout()">
          <i class="pi pi-sign-out" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </header>
</template>

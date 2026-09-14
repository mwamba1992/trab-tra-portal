<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();

interface MenuItem {
  label: string;
  icon: string;
  to: string;
  permission?: string;
}

const ALL_ITEMS: MenuItem[] = [
  { label: 'Dashboard', icon: 'pi pi-th-large', to: '/dashboard' },
  { label: 'Appeals Against TRA', icon: 'pi pi-briefcase', to: '/appeals' },
  { label: 'Summons', icon: 'pi pi-calendar', to: '/summons' },
  { label: 'Decisions', icon: 'pi pi-verified', to: '/decisions' },
  { label: 'TRA Officers', icon: 'pi pi-users', to: '/officers', permission: 'TRA Manage Users' },
];

const items = computed(() => ALL_ITEMS.filter((i) => !i.permission || auth.can(i.permission)));

const isActive = (to: string) => route.path === to || route.path.startsWith(to + '/');
</script>

<template>
  <div class="tra-usercard">
    <div class="who">{{ auth.fullName }}</div>
    <div class="meta">
      <span class="idno">{{ auth.user?.email }}</span>
      <span class="pill">{{ auth.isAdmin ? 'Admin' : 'Officer' }}</span>
    </div>
    <div class="org">TANZANIA REVENUE AUTHORITY · RESPONDENT</div>
  </div>

  <h2 class="tra-menu-head"><i class="pi pi-star-fill" aria-hidden="true"></i> My Menu</h2>
  <nav class="tra-menu" aria-label="Sections">
    <router-link
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="tra-menu-item"
      :class="{ active: isActive(item.to) }"
      :aria-current="isActive(item.to) ? 'page' : undefined"
    >
      <i :class="item.icon" aria-hidden="true"></i>
      <span>{{ item.label }}</span>
    </router-link>
  </nav>
</template>

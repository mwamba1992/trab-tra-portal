<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ConfirmDialog from 'primevue/confirmdialog';
import AppTopbar from './AppTopbar.vue';
import AppSidebar from './AppSidebar.vue';
import FilePreviewDialog from '@/components/files/FilePreviewDialog.vue';

const SIDEBAR_ID = 'tra-sidebar';
const route = useRoute();
const sidebarOpen = ref(false);

const closeSidebar = () => {
  sidebarOpen.value = false;
};

watch(() => route.fullPath, closeSidebar);

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && sidebarOpen.value) closeSidebar();
};

// Leaving the narrow layout while the drawer is open must not leave it "open" for next time.
const wide = window.matchMedia('(min-width: 1024px)');
const onBreakpoint = (e: MediaQueryListEvent) => {
  if (e.matches) closeSidebar();
};

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  wide.addEventListener('change', onBreakpoint);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  wide.removeEventListener('change', onBreakpoint);
});
</script>

<template>
  <div class="tra-app">
    <AppTopbar :sidebar-open="sidebarOpen" :sidebar-id="SIDEBAR_ID" @toggle-sidebar="sidebarOpen = !sidebarOpen" />
    <div class="tra-shell">
      <aside :id="SIDEBAR_ID" class="tra-sidebar" :class="{ open: sidebarOpen }" aria-label="Main navigation">
        <AppSidebar />
      </aside>
      <button
        v-if="sidebarOpen"
        type="button"
        class="tra-backdrop"
        aria-label="Close navigation menu"
        tabindex="-1"
        @click="closeSidebar"
      ></button>
      <main class="tra-main">
        <!-- No route transition: an out-in fade waits on animation frames, which browsers pause in
             background tabs, leaving navigation stuck on the old page until the tab is shown. -->
        <router-view />
      </main>
    </div>
    <ConfirmDialog :style="{ width: 'min(440px, calc(100vw - 32px))' }" />
    <!-- Shared document preview: judgements and case documents open here instead of downloading -->
    <FilePreviewDialog />
  </div>
</template>

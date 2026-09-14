<script setup lang="ts">
import AppTopbar from './AppTopbar.vue';
import AppSidebar from './AppSidebar.vue';
</script>

<template>
  <div>
    <AppTopbar />
    <div class="tra-shell">
      <aside class="tra-sidebar">
        <AppSidebar />
      </aside>
      <main class="tra-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const lang = ref<'EN' | 'SW'>('EN');
const toggleLang = () => (lang.value = lang.value === 'EN' ? 'SW' : 'EN');
</script>

<template>
  <header class="tra-topbar">
    <!-- Brand -->
    <div class="flex items-center gap-3">
      <div class="tra-emblem">TRA</div>
      <div class="tra-wordmark">
        IDRAS<span class="badge">APPEALS</span>
        <span class="sub">Tanzania Revenue Authority</span>
      </div>
    </div>

    <!-- Module tabs -->
    <nav class="tra-modtabs">
      <button class="tra-modtab active"><i class="pi pi-briefcase"></i> Tax Appeals</button>
      <button class="tra-modtab"><i class="pi pi-inbox"></i> Correspondence</button>
    </nav>

    <!-- Utility cluster -->
    <div class="tra-utility">
      <button class="tra-iconbtn" v-tooltip.bottom="'Messages'">
        <i class="pi pi-envelope"></i>
        <span class="dot">2</span>
      </button>
      <button class="tra-iconbtn" v-tooltip.bottom="'Profile'"><i class="pi pi-user"></i></button>
      <button class="tra-iconbtn" @click="toggleLang" v-tooltip.bottom="'Language'">
        <i class="pi pi-globe"></i>
      </button>
      <span class="text-[11px] font-extrabold text-tra-ink -ml-1">{{ lang }}</span>
      <button class="tra-iconbtn" v-tooltip.bottom="'Settings'"><i class="pi pi-sliders-h"></i></button>

      <div class="tra-user-chip">
        <div class="tra-avatar">{{ auth.initials }}</div>
        <div class="leading-tight">
          <div class="name">{{ auth.fullName }}</div>
          <div class="role">{{ auth.isAdmin ? 'TRA Administrator' : 'TRA Officer' }}</div>
        </div>
        <button class="tra-iconbtn" @click="auth.logout()" v-tooltip.bottom="'Sign out'">
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </div>
  </header>
</template>

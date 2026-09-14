<script setup lang="ts">
import { computed } from 'vue';

export interface Crumb {
  label: string;
  to?: string;
}

const props = defineProps<{ title: string; crumbs?: Array<string | Crumb> }>();

// Views pass plain labels; the known section names resolve to their routes.
const KNOWN_ROUTES: Record<string, string> = {
  'Tax Appeals': '/dashboard',
  Dashboard: '/dashboard',
  Appeals: '/appeals',
  'Appeals Against TRA': '/appeals',
  Summons: '/summons',
  Decisions: '/decisions',
  Officers: '/officers',
};

const items = computed<Crumb[]>(() =>
  (props.crumbs ?? []).map((c) => (typeof c === 'string' ? { label: c, to: KNOWN_ROUTES[c] } : c)).filter((c) => c.label),
);
</script>

<template>
  <div>
    <nav class="tra-breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>
          <router-link to="/dashboard" aria-label="Home"><i class="pi pi-home" aria-hidden="true"></i></router-link>
        </li>
        <li v-for="(c, i) in items" :key="`${i}-${c.label}`">
          <i class="pi pi-angle-right" aria-hidden="true"></i>
          <span v-if="i === items.length - 1" aria-current="page">{{ c.label }}</span>
          <router-link v-else-if="c.to" :to="c.to">{{ c.label }}</router-link>
          <span v-else>{{ c.label }}</span>
        </li>
      </ol>
    </nav>
    <div class="tra-pagehead">
      <div class="tra-pagetitle">
        <h1>{{ title }}</h1>
      </div>
      <div class="tra-pageactions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

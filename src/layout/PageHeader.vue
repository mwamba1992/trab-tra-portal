<script setup lang="ts">
defineProps<{ title: string; crumbs?: string[] }>();
</script>

<template>
  <div>
    <div class="tra-breadcrumb">
      <i class="pi pi-home"></i>
      <template v-for="(c, i) in crumbs" :key="i">
        <i class="pi pi-angle-right"></i><span>{{ c }}</span>
      </template>
    </div>
    <div class="tra-pagehead">
      <div class="tra-pagetitle">
        <h1>{{ title }}</h1>
        <i class="pi pi-star-fill star" v-tooltip.top="'Favourite'"></i>
        <i class="pi pi-bell bell" v-tooltip.top="'Alerts'"></i>
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

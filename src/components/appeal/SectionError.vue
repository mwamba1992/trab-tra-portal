<script setup lang="ts">
defineProps<{ message: string; compact?: boolean }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="section-error" :class="{ compact }" role="alert">
    <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
    <span class="msg">{{ message }}</span>
    <button type="button" class="retry" @click="emit('retry')"><i class="pi pi-refresh" aria-hidden="true"></i> Retry</button>
  </div>
</template>

<style scoped>
.section-error {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  padding: 11px 14px;
  border-radius: 8px;
  background: #fef3f2;
  border: 1px solid #fecdca;
  color: #b42318;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}
.section-error.compact {
  padding: 7px 10px;
  font-size: 12px;
}
.msg {
  flex: 1;
  min-width: 0;
}
.retry {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  font-size: 12px;
  color: #b42318;
  background: #fff;
  border: 1px solid #fecdca;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}
.retry:hover {
  background: #fee4e2;
}
</style>

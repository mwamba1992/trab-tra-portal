<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { TraApi } from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';

const toast = useToast();
const days = ref<number | null>(null);
const saved = ref<number | null>(null);
const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const submitted = ref(false);

// Backend ReplyDeadlineDto: integer >= 1.
const fieldError = computed(() => {
  const v = days.value;
  if (v === null || Number.isNaN(v)) return 'Enter the number of days.';
  if (!Number.isInteger(v) || v < 1) return 'Enter a whole number of at least 1.';
  return '';
});
const showError = computed(() => submitted.value && !!fieldError.value);

const load = async () => {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await TraApi.getReplyDeadlineDays();
    days.value = res.days;
    saved.value = res.days;
  } catch (e) {
    loadError.value = apiErrorMessage(e, 'Could not load the reply deadline.');
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  submitted.value = true;
  if (fieldError.value || days.value === null) return;
  saving.value = true;
  try {
    const res = await TraApi.setReplyDeadlineDays(days.value);
    days.value = res.days;
    saved.value = res.days;
    submitted.value = false;
    toast.add({ severity: 'success', summary: 'Saved', detail: `Reply deadline set to ${res.days} days`, life: 3000 });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: apiErrorMessage(e, 'Could not save the reply deadline.'), life: 5000 });
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="tra-card tra-card-pad deadline" aria-labelledby="deadline-title">
    <div class="deadline-text">
      <h2 id="deadline-title" class="deadline-title">Reply deadline</h2>
      <p class="deadline-desc">Days TRA has to file a reply, counted from the appeal filing date.</p>
    </div>

    <div v-if="loading" class="deadline-controls" aria-busy="true">
      <span class="skeleton deadline-skel"></span>
      <span class="sr-only">Loading reply deadline</span>
    </div>

    <div v-else-if="loadError" class="state-error deadline-controls" role="alert">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      <span>{{ loadError }}</span>
      <button type="button" class="tra-btn tra-btn-ghost" @click="load"><i class="pi pi-refresh" aria-hidden="true"></i> Retry</button>
    </div>

    <form v-else class="deadline-controls" novalidate @submit.prevent="save">
      <div>
        <label for="deadline-days" class="sr-only">Reply deadline in days</label>
        <div class="deadline-input">
          <input
            id="deadline-days"
            v-model.number="days"
            class="fld"
            type="number"
            min="1"
            step="1"
            :aria-invalid="showError ? 'true' : undefined"
            :aria-describedby="showError ? 'deadline-days-error' : undefined"
          />
          <span class="deadline-unit">days</span>
          <button type="submit" class="tra-btn tra-btn-dark" :disabled="saving || days === saved">
            <i class="pi" :class="saving ? 'pi-spin pi-spinner' : 'pi-check'" aria-hidden="true"></i> Save
          </button>
        </div>
        <p v-if="showError" id="deadline-days-error" class="fld-error">{{ fieldError }}</p>
      </div>
    </form>
  </section>
</template>

<style scoped>
.deadline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-bottom: 16px;
}
.deadline-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--tra-black);
}
.deadline-desc {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--tra-muted);
}
.deadline-controls {
  margin-left: auto;
}
.deadline-input {
  display: flex;
  align-items: center;
  gap: 8px;
}
.deadline-input .fld {
  width: 96px;
}
.deadline-unit {
  font-size: 13px;
  color: var(--tra-muted);
}
.deadline-skel {
  width: 220px;
  height: 38px;
}
@media (max-width: 640px) {
  .deadline-controls {
    margin-left: 0;
    width: 100%;
  }
}
</style>

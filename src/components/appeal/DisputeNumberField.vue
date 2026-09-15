<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { TraApi, type AppealDetail } from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';

const props = defineProps<{ appeal: AppealDetail; canEdit: boolean }>();
const emit = defineEmits<{ saved: [appeal: AppealDetail] }>();

const toast = useToast();
const editing = ref(false);
const draft = ref('');
const saving = ref(false);

const start = () => {
  draft.value = props.appeal.disputeNo ?? '';
  editing.value = true;
};

const save = async () => {
  saving.value = true;
  try {
    const updated = await TraApi.setDisputeNo(props.appeal.id, draft.value.trim());
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: draft.value.trim() ? 'Dispute number linked' : 'Dispute number removed',
      life: 3000,
    });
    editing.value = false;
    emit('saved', updated);
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Not saved', detail: apiErrorMessage(e, 'The dispute number could not be saved'), life: 4500 });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <section class="dispute" aria-labelledby="dispute-label">
    <div class="flex items-center justify-between gap-2">
      <span id="dispute-label" class="dispute-label">TRA Dispute No.</span>
      <button v-if="canEdit && !editing" type="button" class="link-btn" @click="start">
        {{ appeal.disputeNo ? 'Change' : 'Link' }}
      </button>
    </div>
    <form v-if="editing" class="mt-2 flex flex-col gap-2" @submit.prevent="save">
      <label for="dispute-no" class="sr-only">TRA dispute number</label>
      <input id="dispute-no" v-model="draft" maxlength="60" class="dispute-input" placeholder="e.g. TRA/OBJ/2026/0142" :disabled="saving" />
      <div class="flex gap-2 justify-end">
        <button type="button" class="tra-btn tra-btn-ghost" :disabled="saving" @click="editing = false">Cancel</button>
        <button type="submit" class="tra-btn tra-btn-dark" :disabled="saving">
          <i v-if="saving" class="pi pi-spin pi-spinner" aria-hidden="true"></i> Save
        </button>
      </div>
    </form>
    <p v-else class="dispute-value">{{ appeal.disputeNo || 'Not linked' }}</p>
  </section>
</template>

<style scoped>
.dispute {
  margin: 0 0 16px;
  padding: 12px 14px;
  border: 1px solid var(--tra-border);
  border-radius: 9px;
  background: #fffdf3;
}
.dispute-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--tra-muted);
}
.dispute-value {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--tra-black);
  font-variant-numeric: tabular-nums;
}
.dispute-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.dispute-input:focus {
  border-color: var(--tra-yellow);
  box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.2);
}
.link-btn {
  border: 0;
  background: none;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-ink);
  text-decoration: underline;
  text-decoration-color: var(--tra-yellow-dark);
  cursor: pointer;
}
.tra-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>

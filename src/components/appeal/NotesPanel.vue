<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { TraApi, type CaseNote } from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';
import SectionError from './SectionError.vue';
import { formatDateTime } from './appealUi';

const props = defineProps<{ appealId: string; notes: CaseNote[]; error: string }>();
const emit = defineEmits<{ added: []; retry: [] }>();

const toast = useToast();
const noteBody = ref('');
const saving = ref(false);

const addNote = async () => {
  if (!noteBody.value.trim()) return;
  saving.value = true;
  try {
    await TraApi.addNote(props.appealId, noteBody.value);
    noteBody.value = '';
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Internal note added', life: 2500 });
    emit('added');
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Note not saved', detail: apiErrorMessage(e, 'The note could not be saved.'), life: 4000 });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <div class="note-hint mb-4">
      <i class="pi pi-lock" aria-hidden="true"></i> Internal to TRA — not shared with the Board or appellant.
    </div>
    <div class="mb-5">
      <label for="note-body" class="block text-xs font-bold text-tra-ink mb-2">ADD INTERNAL NOTE</label>
      <textarea
        id="note-body"
        v-model="noteBody"
        rows="3"
        class="fld-area"
        placeholder="Add an internal case note…"
        :disabled="saving"
      ></textarea>
      <div class="flex justify-end mt-2">
        <button type="button" class="tra-btn tra-btn-dark" :disabled="saving || !noteBody.trim()" @click="addNote">
          <i class="pi" :class="saving ? 'pi-spin pi-spinner' : 'pi-plus'" aria-hidden="true"></i> Add Note
        </button>
      </div>
    </div>
    <SectionError v-if="error" :message="error" @retry="emit('retry')" />
    <template v-else>
      <article v-for="nt in notes" :key="nt.id" class="reply-card">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
          <strong class="text-sm text-tra-black">{{ nt.authorName || 'TRA Officer' }}</strong>
          <span class="text-xs text-tra-muted">{{ formatDateTime(nt.createdAt) }}</span>
        </div>
        <p class="text-sm text-tra-text whitespace-pre-wrap m-0">{{ nt.body }}</p>
      </article>
      <div v-if="!notes.length" class="tra-empty"><i class="pi pi-comment" aria-hidden="true"></i>No internal notes yet.</div>
    </template>
  </div>
</template>

<style scoped>
.note-hint {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--tra-muted);
  background: #f5f6f7;
  padding: 6px 12px;
  border-radius: 7px;
}
.reply-card {
  border: 1px solid var(--tra-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  background: #fcfcfd;
}
.fld-area {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}
.fld-area:focus {
  border-color: var(--tra-yellow);
  box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.2);
}
.tra-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>

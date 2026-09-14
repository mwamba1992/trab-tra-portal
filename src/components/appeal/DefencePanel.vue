<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { TraApi, type AppealDetail, type Reply } from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';
import DeadlineBanner from './DeadlineBanner.vue';
import SectionError from './SectionError.vue';
import { formatDateTime } from './appealUi';

const props = defineProps<{ appeal: AppealDetail; replies: Reply[]; canReply: boolean; error: string }>();
const emit = defineEmits<{ filed: []; retry: [] }>();

const toast = useToast();
const replyBody = ref('');
const filing = ref(false);

const submitReply = async () => {
  if (!replyBody.value.trim()) return;
  filing.value = true;
  try {
    await TraApi.fileReply(props.appeal.id, replyBody.value);
    replyBody.value = '';
    toast.add({ severity: 'success', summary: 'Filed', detail: 'Statement of defence filed', life: 3000 });
    emit('filed');
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Filing failed', detail: apiErrorMessage(e, 'Failed to file reply'), life: 4000 });
  } finally {
    filing.value = false;
  }
};
</script>

<template>
  <div>
    <DeadlineBanner :appeal="appeal" />

    <!-- A decided or concluded case no longer takes a defence; the banner above explains why -->
    <div v-if="canReply && !appeal.caseClosed" class="mb-5">
      <label for="reply-body" class="block text-xs font-bold text-tra-ink mb-2">FILE STATEMENT OF DEFENCE</label>
      <textarea
        id="reply-body"
        v-model="replyBody"
        rows="5"
        class="fld-area"
        placeholder="State TRA's grounds of opposition to this appeal…"
        :disabled="filing"
      ></textarea>
      <div class="flex justify-end mt-2">
        <button type="button" class="tra-btn tra-btn-dark" :disabled="filing || !replyBody.trim()" @click="submitReply">
          <i class="pi" :class="filing ? 'pi-spin pi-spinner' : 'pi-send'" aria-hidden="true"></i> File Defence
        </button>
      </div>
    </div>

    <h2 class="sec-head">Filed Replies</h2>
    <SectionError v-if="error" :message="error" @retry="emit('retry')" />
    <template v-else>
      <article v-for="r in replies" :key="r.id" class="reply-card">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
          <strong class="text-sm text-tra-black">{{ r.filedByName || 'TRA Officer' }}</strong>
          <span class="text-xs text-tra-muted">{{ formatDateTime(r.createdAt) }}</span>
        </div>
        <p class="text-sm text-tra-text whitespace-pre-wrap m-0">{{ r.body }}</p>
      </article>
      <div v-if="!replies.length" class="tra-empty"><i class="pi pi-pencil" aria-hidden="true"></i>No defence filed yet.</div>
    </template>
  </div>
</template>

<style scoped>
.sec-head {
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 8px;
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

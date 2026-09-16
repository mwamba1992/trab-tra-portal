<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import {
  SUBMISSION_STAGES,
  SUBMISSION_STAGE_LABELS,
  TraCaseApi,
  type AppealDetail,
  type SubmissionStage,
  type SubmissionWindow,
} from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';
import SectionError from './SectionError.vue';
import { formatDateTime, fileIcon, useStoredFile } from './appealUi';
import { windowState } from './submissionWindow';

const props = defineProps<{ appeal: AppealDetail; canFile: boolean }>();
const emit = defineEmits<{ filed: [] }>();

const toast = useToast();
const { busy, openFile } = useStoredFile();

const win = ref<SubmissionWindow | null>(null);
const loading = ref(true);
const error = ref('');
const filing = ref(false);
const stage = ref<SubmissionStage>('REPLY');
const body = ref('');
const attachment = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const state = computed(() => windowState(win.value));
const submissions = computed(() => win.value?.submissions ?? []);
const canSubmit = computed(() => !!win.value?.open && (body.value.trim().length > 0 || !!attachment.value));

const load = async () => {
  loading.value = true;
  try {
    win.value = await TraCaseApi.submissions(props.appeal.id);
    error.value = '';
    // Lead with the stage TRA has not filed yet; the respondent normally replies.
    const filed = new Set(submissions.value.filter((s) => s.party === 'RESPONDENT').map((s) => s.stage));
    stage.value = SUBMISSION_STAGES.find((s) => !filed.has(s)) ?? 'REJOINDER';
  } catch (e) {
    error.value = apiErrorMessage(e, 'Written submissions could not be loaded.');
  } finally {
    loading.value = false;
  }
};

const onPick = (e: Event) => {
  attachment.value = (e.target as HTMLInputElement).files?.[0] ?? null;
};

const submit = async () => {
  filing.value = true;
  try {
    await TraCaseApi.fileSubmission(props.appeal.id, { stage: stage.value, body: body.value, file: attachment.value });
    body.value = '';
    attachment.value = null;
    if (fileInput.value) fileInput.value.value = '';
    toast.add({ severity: 'success', summary: 'Filed', detail: 'Written submission filed', life: 3000 });
    await load();
    emit('filed');
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Filing failed', detail: apiErrorMessage(e, 'The submission was not filed.'), life: 5000 });
  } finally {
    filing.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div>
    <div class="window" :class="state.tone">
      <i class="pi" :class="win?.hearingDate ? 'pi-calendar' : 'pi-clock'" aria-hidden="true"></i>
      <div>
        <strong v-if="win?.hearingDate"
          >Hearing on {{ win.hearingDate }}<span v-if="win.venue"> at {{ win.venue }}</span></strong
        >
        <strong v-else>No hearing scheduled</strong>
        <p>{{ state.message }}</p>
      </div>
    </div>

    <div v-if="canFile && win?.open" class="mb-5">
      <label for="submission-stage" class="block text-xs font-bold text-tra-ink mb-2">FILE WRITTEN SUBMISSION</label>
      <select id="submission-stage" v-model="stage" class="fld mb-2" :disabled="filing">
        <option v-for="s in SUBMISSION_STAGES" :key="s" :value="s">{{ SUBMISSION_STAGE_LABELS[s] }}</option>
      </select>
      <textarea
        id="submission-body"
        v-model="body"
        rows="5"
        class="fld-area"
        placeholder="Type the submission, or leave this blank and attach it below…"
        :disabled="filing"
      ></textarea>
      <div class="flex items-center justify-between flex-wrap gap-2 mt-2">
        <input ref="fileInput" type="file" accept=".pdf,.doc,.docx" aria-label="Attach the submission" @change="onPick" />
        <button type="button" class="tra-btn tra-btn-dark" :disabled="filing || !canSubmit" @click="submit">
          <i class="pi" :class="filing ? 'pi-spin pi-spinner' : 'pi-send'" aria-hidden="true"></i> File Submission
        </button>
      </div>
    </div>

    <h2 class="sec-head">Filed Submissions</h2>
    <SectionError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="tra-empty"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i>Loading submissions…</div>
    <template v-else>
      <article v-for="s in submissions" :key="s.id" class="sub-card">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
          <strong class="text-sm text-tra-black">
            {{ SUBMISSION_STAGE_LABELS[s.stage] }}
            <span class="party" :class="s.party === 'RESPONDENT' ? 'tra' : 'appellant'">
              {{ s.party === 'RESPONDENT' ? 'TRA' : 'Appellant' }}
            </span>
          </strong>
          <span class="text-xs text-tra-muted">{{ s.filedByName || '-' }} · {{ formatDateTime(s.createdAt) }}</span>
        </div>
        <p v-if="s.body" class="text-sm text-tra-text whitespace-pre-wrap m-0">{{ s.body }}</p>
        <button
          v-if="s.fileName"
          type="button"
          class="attach"
          :disabled="busy === `download:${s.fileName}`"
          @click="openFile(s.fileName, 'view', s.originalName)"
        >
          <i class="pi" :class="fileIcon(s.originalName)" aria-hidden="true"></i>
          {{ s.originalName || 'Attachment' }}
        </button>
      </article>
      <div v-if="!submissions.length" class="tra-empty">
        <i class="pi pi-file-edit" aria-hidden="true"></i>Nothing has been filed for this hearing yet.
      </div>
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
.window {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid var(--tra-border);
  border-left-width: 4px;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  background: #fcfcfd;
}
.window p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--tra-muted);
}
.window strong {
  font-size: 13px;
}
.window.grey {
  border-left-color: var(--tra-border-strong);
}
.window.green {
  border-left-color: #16a34a;
}
.window.gold {
  border-left-color: var(--tra-yellow);
  background: #fffdf3;
}
.window.red {
  border-left-color: #dc2626;
  background: #fef5f5;
}
.sub-card {
  border: 1px solid var(--tra-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  background: #fcfcfd;
}
.party {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  vertical-align: middle;
}
.party.tra {
  background: #fff4c7;
  color: #7a5c00;
}
.party.appellant {
  background: #eef2f7;
  color: #3c4a5c;
}
.attach {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--tra-ink);
  background: none;
  border: 1px solid var(--tra-border-strong);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}
.attach:hover {
  background: #f6f7f9;
}
.fld {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
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
.fld-area:focus,
.fld:focus {
  border-color: var(--tra-yellow);
  box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.2);
}
.tra-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>

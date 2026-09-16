<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Skeleton from 'primevue/skeleton';
import PageHeader from '@/layout/PageHeader.vue';
import {
  TraApi,
  TraCaseApi,
  type Appeal,
  type AppealDetail,
  type AppealParties,
  type CaseAssignment,
  type CaseDocument,
  type CaseNote,
  type Filing,
  type Officer,
  type Reply,
} from '@/service/tra';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage } from '@/utils/errors';
import CaseSummary from '@/components/appeal/CaseSummary.vue';
import CaseAssignmentPanel from '@/components/appeal/CaseAssignmentPanel.vue';
import DeadlineBanner from '@/components/appeal/DeadlineBanner.vue';
import OverviewPanel from '@/components/appeal/OverviewPanel.vue';
import DefencePanel from '@/components/appeal/DefencePanel.vue';
import DocumentsPanel from '@/components/appeal/DocumentsPanel.vue';
import NotesPanel from '@/components/appeal/NotesPanel.vue';
import FilingsPanel from '@/components/appeal/FilingsPanel.vue';
import SubmissionsPanel from '@/components/appeal/SubmissionsPanel.vue';
import DisputeNumberField from '@/components/appeal/DisputeNumberField.vue';
import DepositPanel from '@/components/appeal/DepositPanel.vue';

type TabKey = 'overview' | 'reply' | 'submissions' | 'filings' | 'documents' | 'notes';
type SectionKey = 'parties' | 'replies' | 'filings' | 'documents' | 'notes' | 'officers' | 'assignments';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const id = route.params.id as string;

const appeal = ref<AppealDetail | null>(null);
const parties = ref<AppealParties>({ appellants: [], respondents: [] });
const replies = ref<Reply[]>([]);
const filings = ref<Filing[]>([]);
const documents = ref<CaseDocument[]>([]);
const notes = ref<CaseNote[]>([]);
const officers = ref<Officer[]>([]);
const assignments = ref<CaseAssignment[]>([]);

const loading = ref(true);
const loadError = ref('');
const errors = reactive<Record<SectionKey, string>>({
  parties: '',
  replies: '',
  filings: '',
  documents: '',
  notes: '',
  officers: '',
  assignments: '',
});
const tab = ref<TabKey>('overview');

const canReply = computed(() => auth.can('TRA File Reply'));
const canDocs = computed(() => auth.can('TRA Manage Documents'));
const canNotes = computed(() => auth.can('TRA Manage Cases'));
const canAssign = computed(() => auth.can('TRA Assign Cases'));

const tabs = computed(() => {
  const list: { key: TabKey; label: string; icon: string; count: number; badge: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'pi-info-circle', count: 0, badge: 'grey' },
    { key: 'reply', label: 'Defence', icon: 'pi-pencil', count: replies.value.length, badge: 'gold' },
    { key: 'submissions', label: 'Submissions', icon: 'pi-file-edit', count: 0, badge: 'grey' },
    { key: 'filings', label: 'Objections & Appeal', icon: 'pi-flag', count: filings.value.length, badge: 'gold' },
  ];
  if (canDocs.value)
    list.push({ key: 'documents', label: 'Documents', icon: 'pi-paperclip', count: documents.value.length, badge: 'grey' });
  if (canNotes.value) list.push({ key: 'notes', label: 'Notes', icon: 'pi-comment', count: notes.value.length, badge: 'grey' });
  return list;
});

const fallback: Record<SectionKey, string> = {
  parties: 'Parties could not be loaded.',
  replies: 'Filed replies could not be loaded.',
  filings: 'Objections and appeal notices could not be loaded.',
  documents: 'Documents could not be loaded.',
  notes: 'Internal notes could not be loaded.',
  officers: 'Officer list could not be loaded.',
  assignments: 'Assignment history could not be loaded.',
};

// Secondary sections load independently; a failure only affects its own section.
const loaders: Record<SectionKey, () => Promise<void>> = {
  parties: async () => {
    parties.value = await TraCaseApi.parties(id);
  },
  replies: async () => {
    replies.value = await TraApi.replies(id);
  },
  filings: async () => {
    filings.value = await TraApi.filings(id);
  },
  documents: async () => {
    documents.value = await TraCaseApi.documents(id);
  },
  notes: async () => {
    notes.value = await TraApi.notes(id);
  },
  officers: async () => {
    officers.value = (await TraApi.officers()).items.filter((o) => o.status === 'active');
  },
  assignments: async () => {
    assignments.value = await TraApi.assignments(id);
  },
};

const enabledSections = (): SectionKey[] => {
  const keys: SectionKey[] = ['parties', 'replies', 'filings'];
  if (canDocs.value) keys.push('documents');
  if (canNotes.value) keys.push('notes');
  if (canAssign.value) keys.push('officers', 'assignments');
  return keys;
};

const loadSections = async (keys: SectionKey[]) => {
  const results = await Promise.allSettled(keys.map((k) => loaders[k]()));
  results.forEach((res, i) => {
    const key = keys[i];
    errors[key] = res.status === 'rejected' ? apiErrorMessage(res.reason, fallback[key]) : '';
  });
};

const reloadSection = (key: SectionKey) => loadSections([key]);

const loadAll = async () => {
  loading.value = true;
  loadError.value = '';
  const [appealResult] = await Promise.allSettled([TraCaseApi.appeal(id), loadSections(enabledSections())]);
  if (appealResult.status === 'fulfilled') {
    appeal.value = appealResult.value;
  } else {
    appeal.value = null;
    loadError.value = apiErrorMessage(appealResult.reason, 'This appeal could not be loaded.');
  }
  loading.value = false;
};

const refreshAppeal = async () => {
  try {
    appeal.value = await TraCaseApi.appeal(id);
  } catch (e) {
    toast.add({
      severity: 'warn',
      summary: 'Refresh failed',
      detail: apiErrorMessage(e, 'Case details could not be refreshed.'),
      life: 3500,
    });
  }
};

const onAssignmentChanged = (updated: Appeal) => {
  if (appeal.value) appeal.value = { ...appeal.value, ...updated };
  void reloadSection('assignments');
};

const onReplyFiled = () => {
  void reloadSection('replies');
  void refreshAppeal();
};

const onFilingLodged = () => {
  void reloadSection('filings');
  void refreshAppeal();
};

const onTabKey = (e: KeyboardEvent, index: number) => {
  const list = tabs.value;
  const next = e.key === 'ArrowRight' ? (index + 1) % list.length : e.key === 'ArrowLeft' ? (index - 1 + list.length) % list.length : -1;
  if (next < 0) return;
  e.preventDefault();
  tab.value = list[next].key;
  document.getElementById(`appeal-tab-${list[next].key}`)?.focus();
};

onMounted(loadAll);
</script>

<template>
  <div>
    <PageHeader :title="appeal?.appealNo || 'Appeal'" :crumbs="['Tax Appeals', 'Appeals', appeal?.appealNo || '']">
      <template #actions>
        <button type="button" class="tra-btn tra-btn-ghost" @click="router.push('/appeals')">
          <i class="pi pi-arrow-left" aria-hidden="true"></i> Back
        </button>
      </template>
    </PageHeader>

    <!-- Loading skeleton -->
    <div v-if="loading" class="detail-grid" aria-busy="true" aria-live="polite">
      <span class="sr-only">Loading appeal…</span>
      <div class="tra-card tra-card-pad h-fit">
        <Skeleton width="40%" height="0.8rem" class="mb-4" />
        <Skeleton v-for="n in 8" :key="n" height="1.1rem" class="mb-3" />
      </div>
      <div class="tra-card tra-card-pad">
        <div class="flex gap-3 mb-5">
          <Skeleton v-for="n in 4" :key="n" width="6rem" height="2rem" />
        </div>
        <Skeleton height="6rem" class="mb-4" />
        <Skeleton width="70%" height="1rem" class="mb-3" />
        <Skeleton width="55%" height="1rem" />
      </div>
    </div>

    <!-- Critical failure -->
    <div v-else-if="!appeal" class="tra-card tra-card-pad load-error" role="alert">
      <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
      <h2>Unable to open this appeal</h2>
      <p>{{ loadError }}</p>
      <div class="flex gap-2 justify-center flex-wrap">
        <button type="button" class="tra-btn tra-btn-dark" @click="loadAll"><i class="pi pi-refresh" aria-hidden="true"></i> Retry</button>
        <button type="button" class="tra-btn tra-btn-ghost" @click="router.push('/appeals')">Back to appeals</button>
      </div>
    </div>

    <template v-else>
      <DeadlineBanner :appeal="appeal" />

      <div class="detail-grid">
        <aside class="tra-card tra-card-pad h-fit" aria-label="Case summary">
          <CaseSummary :appeal="appeal" :parties="parties" :parties-error="errors.parties" @retry-parties="reloadSection('parties')" />
          <DisputeNumberField :appeal="appeal" :can-edit="canNotes" @saved="(updated) => (appeal = { ...appeal, ...updated })" />
          <DepositPanel :appeal="appeal" />
          <CaseAssignmentPanel
            :appeal="appeal"
            :can-assign="canAssign"
            :officers="officers"
            :assignments="assignments"
            :officers-error="errors.officers"
            :assignments-error="errors.assignments"
            @changed="onAssignmentChanged"
            @retry-officers="reloadSection('officers')"
            @retry-assignments="reloadSection('assignments')"
          />
        </aside>

        <section class="tra-card min-w-0">
          <div class="tab-bar" role="tablist" aria-label="Appeal sections">
            <button
              v-for="(t, i) in tabs"
              :id="`appeal-tab-${t.key}`"
              :key="t.key"
              type="button"
              role="tab"
              class="detail-tab"
              :class="{ active: tab === t.key }"
              :aria-selected="tab === t.key"
              :aria-controls="`appeal-panel-${t.key}`"
              :tabindex="tab === t.key ? 0 : -1"
              @click="tab = t.key"
              @keydown="onTabKey($event, i)"
            >
              <i class="pi" :class="t.icon" aria-hidden="true"></i> {{ t.label }}
              <span v-if="t.count" class="tra-badge ml-1" :class="t.badge">{{ t.count }}</span>
            </button>
          </div>

          <div :id="`appeal-panel-${tab}`" role="tabpanel" :aria-labelledby="`appeal-tab-${tab}`" class="tra-card-pad">
            <OverviewPanel
              v-if="tab === 'overview'"
              :appeal="appeal"
              :parties="parties"
              :parties-error="errors.parties"
              @retry-parties="reloadSection('parties')"
            />
            <DefencePanel
              v-else-if="tab === 'reply'"
              :appeal="appeal"
              :replies="replies"
              :can-reply="canReply"
              :error="errors.replies"
              @filed="onReplyFiled"
              @retry="reloadSection('replies')"
            />
            <FilingsPanel
              v-else-if="tab === 'filings'"
              :appeal="appeal"
              :filings="filings"
              :can-file="canReply"
              :error="errors.filings"
              @filed="onFilingLodged"
              @retry="reloadSection('filings')"
            />
            <SubmissionsPanel v-else-if="tab === 'submissions'" :appeal="appeal" :can-file="canReply" />
            <DocumentsPanel
              v-else-if="tab === 'documents' && canDocs"
              :appeal-id="id"
              :documents="documents"
              :can-upload="canDocs"
              :error="errors.documents"
              :current-user-id="auth.user?.id ?? null"
              @uploaded="reloadSection('documents')"
              @retry="reloadSection('documents')"
            />
            <NotesPanel
              v-else-if="tab === 'notes' && canNotes"
              :appeal-id="id"
              :notes="notes"
              :error="errors.notes"
              @added="reloadSection('notes')"
              @retry="reloadSection('notes')"
            />
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 1024px) {
  .detail-grid {
    grid-template-columns: 300px minmax(0, 1fr);
  }
}
.tab-bar {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--tra-border);
}
.detail-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 14px 18px;
  font-weight: 700;
  font-size: 13px;
  color: var(--tra-muted);
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  cursor: pointer;
  white-space: nowrap;
}
.detail-tab:hover {
  color: var(--tra-black);
}
.detail-tab.active {
  color: var(--tra-black);
  border-bottom-color: var(--tra-yellow);
}
.detail-tab:focus-visible {
  outline: 2px solid var(--tra-yellow-dark);
  outline-offset: -2px;
}
.load-error {
  text-align: center;
  padding: 40px 20px;
}
.load-error > i {
  font-size: 32px;
  color: var(--tra-danger);
}
.load-error h2 {
  font-size: 17px;
  font-weight: 800;
  color: var(--tra-black);
  margin: 12px 0 6px;
}
.load-error p {
  font-size: 13px;
  color: var(--tra-muted);
  margin: 0 0 18px;
}
</style>

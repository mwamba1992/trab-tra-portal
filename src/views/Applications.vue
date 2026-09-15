<script setup lang="ts">
import { computed, ref } from 'vue';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import SectionError from '@/components/appeal/SectionError.vue';
import { formatDateTime } from '@/components/appeal/appealUi';
import { TraApi, type ApplicationItem, type ApplicationResponse } from '@/service/tra';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage } from '@/utils/errors';
import { formatDate, humanize } from '@/utils/format';

const auth = useAuthStore();
const toast = useToast();
const canRespond = computed(() => auth.can('TRA File Reply'));

const search = ref('');
const table = ref<InstanceType<typeof TraTable> | null>(null);
const fetchPage = (page: number, size: number) => TraApi.applications(page, size, search.value);
const runSearch = () => table.value?.reload();
const clearSearch = () => {
  search.value = '';
  table.value?.reload();
};

// Detail dialog: the application, TRA's responses and the response form.
const selected = ref<ApplicationItem | null>(null);
const responses = ref<ApplicationResponse[]>([]);
const responsesError = ref('');
const loadingResponses = ref(false);
const draft = ref('');
const filing = ref(false);

const visible = computed({
  get: () => selected.value !== null,
  set: (open: boolean) => {
    if (!open) selected.value = null;
  },
});

const loadResponses = async () => {
  if (!selected.value) return;
  loadingResponses.value = true;
  responsesError.value = '';
  try {
    responses.value = await TraApi.applicationResponses(selected.value.id);
  } catch (e) {
    responsesError.value = apiErrorMessage(e, 'Responses could not be loaded.');
  } finally {
    loadingResponses.value = false;
  }
};

const open = (row: object) => {
  selected.value = row as ApplicationItem;
  responses.value = [];
  draft.value = '';
  void loadResponses();
};

const submit = async () => {
  if (!selected.value || !draft.value.trim()) return;
  filing.value = true;
  try {
    await TraApi.respondToApplication(selected.value.id, draft.value);
    draft.value = '';
    toast.add({ severity: 'success', summary: 'Filed', detail: 'Response filed', life: 3000 });
    await loadResponses();
    table.value?.load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Filing failed', detail: apiErrorMessage(e, 'The response could not be filed'), life: 4500 });
  } finally {
    filing.value = false;
  }
};

const statusBadge = (a: ApplicationItem) =>
  a.decided ? { cls: 'grey', text: a.outcome ? humanize(a.outcome) : 'Decided' } : { cls: 'amber', text: humanize(a.status) || 'Pending' };
</script>

<template>
  <div>
    <PageHeader title="Applications" :crumbs="['Tax Appeals', 'Applications']" />
    <p class="text-sm text-tra-muted -mt-2 mb-4">
      Applications before the Board on appeals against TRA, and standalone applications. Open one to read it and file TRA's response.
    </p>

    <div class="tra-card tra-card-pad">
      <form class="search-bar" role="search" @submit.prevent="runSearch">
        <label for="application-search" class="sr-only">Search applications</label>
        <input
          id="application-search"
          v-model="search"
          type="search"
          class="search-input"
          placeholder="Search application no., applicant or appeal no."
        />
        <button type="submit" class="tra-btn tra-btn-dark"><i class="pi pi-search" aria-hidden="true"></i> Search</button>
        <button v-if="search" type="button" class="tra-btn tra-btn-ghost" @click="clearSearch">Clear</button>
      </form>

      <TraTable ref="table" :fetch="fetchPage" clickable errorTitle="Could not load applications" @row-click="open">
        <Column header="Application No.">
          <template #body="{ data }">
            <button type="button" class="row-link" @click="open(data)">{{ data.applicationNo || 'No number yet' }}</button>
            <div class="text-xs text-tra-muted">{{ data.applicationType }}</div>
          </template>
        </Column>
        <Column header="Applicant">
          <template #body="{ data }">
            <div>{{ data.applicantName }}</div>
            <span v-if="data.applicantType === 'Respondent'" class="tra-badge gold">Lodged by TRA</span>
          </template>
        </Column>
        <Column header="Appeal">
          <template #body="{ data }">
            <router-link v-if="data.appealId" :to="`/appeals/${data.appealId}`" class="row-link">{{
              data.appealNo || 'Open appeal'
            }}</router-link>
            <span v-else class="text-tra-muted">Standalone</span>
          </template>
        </Column>
        <Column header="Filed"
          ><template #body="{ data }">{{ formatDate(data.dateOfFiling) }}</template></Column
        >
        <Column header="Status">
          <template #body="{ data }"
            ><span class="tra-badge" :class="statusBadge(data).cls">{{ statusBadge(data).text }}</span></template
          >
        </Column>
        <Column header="TRA Response">
          <template #body="{ data }">
            <span v-if="data.responseCount" class="tra-badge green">Filed ({{ data.responseCount }})</span>
            <span v-else-if="data.decided" class="tra-badge grey">Not filed</span>
            <span v-else class="tra-badge red">Awaiting response</span>
          </template>
        </Column>
        <template #empty
          ><div class="tra-empty"><i class="pi pi-file-check"></i>No applications found.</div></template
        >
      </TraTable>
    </div>

    <Dialog v-model:visible="visible" modal :header="selected?.applicationNo || 'Application'" :style="{ width: 'min(720px, 96vw)' }">
      <div v-if="selected">
        <dl class="facts">
          <div>
            <dt>Applicant</dt>
            <dd>{{ selected.applicantName }} ({{ selected.applicantType }})</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{{ selected.applicationType }} · {{ selected.applicationCategory }}</dd>
          </div>
          <div>
            <dt>Appeal</dt>
            <dd>{{ selected.appealNo || 'Standalone' }}</dd>
          </div>
          <div>
            <dt>Filed</dt>
            <dd>{{ formatDate(selected.dateOfFiling) }}</dd>
          </div>
          <div v-if="selected.taxType">
            <dt>Tax Type</dt>
            <dd>{{ selected.taxType }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{{ statusBadge(selected).text }}</dd>
          </div>
        </dl>

        <h3 class="sec-head">Nature of Application</h3>
        <p class="text-sm text-tra-text whitespace-pre-wrap mt-0 mb-4">{{ selected.natureOfApplication || 'Not stated.' }}</p>

        <template v-if="selected.decided && selected.summaryOfDecision">
          <h3 class="sec-head">Board Decision</h3>
          <p class="text-sm text-tra-text whitespace-pre-wrap mt-0 mb-4">{{ selected.summaryOfDecision }}</p>
        </template>

        <div v-if="canRespond && !selected.decided" class="mb-4">
          <label for="application-response" class="block text-xs font-bold text-tra-ink mb-2">FILE TRA'S RESPONSE</label>
          <textarea
            id="application-response"
            v-model="draft"
            rows="5"
            class="fld-area"
            placeholder="TRA's reply or counter-affidavit to this application…"
            :disabled="filing"
          ></textarea>
          <div class="flex justify-end mt-2">
            <button type="button" class="tra-btn tra-btn-dark" :disabled="filing || !draft.trim()" @click="submit">
              <i class="pi" :class="filing ? 'pi-spin pi-spinner' : 'pi-send'" aria-hidden="true"></i> File Response
            </button>
          </div>
        </div>

        <h3 class="sec-head">TRA Responses</h3>
        <SectionError v-if="responsesError" :message="responsesError" @retry="loadResponses" />
        <div v-else-if="loadingResponses" class="text-sm text-tra-muted">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading…
        </div>
        <template v-else>
          <article v-for="r in responses" :key="r.id" class="response-card">
            <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
              <strong class="text-sm text-tra-black">{{ r.filedByName || 'TRA Officer' }}</strong>
              <span class="text-xs text-tra-muted">{{ formatDateTime(r.createdAt) }}</span>
            </div>
            <p class="text-sm text-tra-text whitespace-pre-wrap m-0">{{ r.body }}</p>
          </article>
          <div v-if="!responses.length" class="tra-empty"><i class="pi pi-comment" aria-hidden="true"></i>No response filed yet.</div>
        </template>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.search-input {
  flex: 1 1 260px;
  min-width: 0;
  padding: 9px 12px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.search-input:focus,
.fld-area:focus {
  border-color: var(--tra-yellow);
  box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.2);
}
.row-link {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 700;
  color: var(--tra-ink);
  text-decoration: none;
  cursor: pointer;
}
.row-link:hover {
  text-decoration: underline;
  text-decoration-color: var(--tra-yellow-dark);
}
.row-link:focus-visible {
  outline: 2px solid var(--tra-yellow-dark);
  outline-offset: 2px;
  border-radius: 3px;
}
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px 16px;
  margin: 0 0 16px;
}
.facts dt {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--tra-muted);
}
.facts dd {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--tra-black);
}
.sec-head {
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 8px;
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
.response-card {
  border: 1px solid var(--tra-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  background: #fcfcfd;
}
.tra-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>

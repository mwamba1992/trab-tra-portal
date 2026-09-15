<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Column from 'primevue/column';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import { TraApi, type DecisionItem } from '@/service/tra';
import { formatDate, humanize } from '@/utils/format';
import { openPreview } from '@/components/files/filePreview';

const router = useRouter();

const wonClass = (w: string | null | undefined) => (/tra|commissioner|respondent/i.test(w || '') ? 'green' : 'red');
const openAppeal = (row: object) => router.push(`/appeals/${(row as DecisionItem).id}`);

// Long decree summaries are clamped; expanded rows show the full text.
const SUMMARY_CLAMP = 140;
const expanded = ref<string[]>([]);
const toggleSummary = (id: string) => {
  expanded.value = expanded.value.includes(id) ? expanded.value.filter((x) => x !== id) : [...expanded.value, id];
};

// Opens the judgement in the portal's preview window; download and print are available there.
const viewJudgement = (d: DecisionItem) => {
  if (!d.judgementFile) return;
  const fileName = d.judgementFile.split('/').pop() || d.judgementFile;
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '.pdf';
  const label = d.appealNo || d.appellantName;
  openPreview({
    fileName,
    title: `Judgement · ${label}`,
    downloadName: `judgement-${label.replace(/[^\w.-]+/g, '-')}${ext}`,
  });
};
</script>

<template>
  <div>
    <PageHeader title="Decisions" :crumbs="['Tax Appeals', 'Decisions']" />
    <p class="text-sm text-tra-muted -mt-2 mb-4">
      Board decisions delivered to TRA. Review outcomes and consider onward appeal to the Tribunal.
    </p>

    <div class="tra-card tra-card-pad">
      <TraTable :fetch="TraApi.decisions" dataKey="id" clickable errorTitle="Could not load decisions" @row-click="openAppeal">
        <Column header="Appeal No.">
          <template #body="{ data }">
            <router-link :to="`/appeals/${data.id}`" class="row-link">{{ data.appealNo || 'No number yet' }}</router-link>
          </template>
        </Column>
        <Column field="appellantName" header="Appellant" />
        <Column header="Tax Type"
          ><template #body="{ data }">{{ data.taxType?.name || '-' }}</template></Column
        >
        <Column header="Decided"
          ><template #body="{ data }">{{ formatDate(data.decidedDate) }}</template></Column
        >
        <Column header="Outcome"
          ><template #body="{ data }"
            ><span class="tra-badge grey">{{ humanize(data.outcomeOfDecision) }}</span></template
          ></Column
        >
        <Column header="Won By">
          <template #body="{ data }"
            ><span v-if="data.wonBy" class="tra-badge" :class="wonClass(data.wonBy)">{{ humanize(data.wonBy) }}</span
            ><span v-else>-</span></template
          >
        </Column>
        <Column header="Summary of Decree" style="min-width: 16rem">
          <template #body="{ data }">
            <template v-if="data.summaryOfDecree">
              <span class="summary">{{
                expanded.includes(data.id) || data.summaryOfDecree.length <= SUMMARY_CLAMP
                  ? data.summaryOfDecree
                  : `${data.summaryOfDecree.slice(0, SUMMARY_CLAMP).trimEnd()}…`
              }}</span>
              <button
                v-if="data.summaryOfDecree.length > SUMMARY_CLAMP"
                type="button"
                class="more-btn"
                :aria-expanded="expanded.includes(data.id)"
                @click="toggleSummary(data.id)"
              >
                {{ expanded.includes(data.id) ? 'Show less' : 'Show more' }}
              </button>
            </template>
            <span v-else class="text-tra-muted">-</span>
          </template>
        </Column>
        <Column header="Judgement">
          <template #body="{ data }">
            <button
              v-if="data.judgementFile"
              type="button"
              class="tra-btn tra-btn-ghost judgement-btn"
              :aria-label="`View judgement for ${data.appealNo || data.appellantName}`"
              @click="viewJudgement(data)"
            >
              <i class="pi pi-file-pdf" aria-hidden="true"></i> View judgement
            </button>
            <span v-else class="text-tra-muted">Not uploaded</span>
          </template>
        </Column>
        <template #empty
          ><div class="tra-empty"><i class="pi pi-verified"></i>No decisions delivered yet.</div></template
        >
      </TraTable>
    </div>
  </div>
</template>

<style scoped>
.row-link {
  font-weight: 700;
  color: var(--tra-ink);
  text-decoration: none;
}
.row-link:hover {
  text-decoration: underline;
  text-decoration-color: var(--tra-yellow-dark);
}
.row-link:focus-visible,
.more-btn:focus-visible {
  outline: 2px solid var(--tra-yellow-dark);
  outline-offset: 2px;
  border-radius: 3px;
}
.summary {
  white-space: pre-line;
  color: var(--tra-text);
}
.more-btn {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-ink);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: var(--tra-yellow);
}
.judgement-btn {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  white-space: nowrap;
}
</style>

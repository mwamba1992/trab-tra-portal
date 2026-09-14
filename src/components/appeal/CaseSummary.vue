<script setup lang="ts">
import type { AppealDetail, AppealParties } from '@/service/tra';
import { formatDate, humanize } from '@/utils/format';
import SectionError from './SectionError.vue';

defineProps<{ appeal: AppealDetail; parties: AppealParties; partiesError: string }>();
const emit = defineEmits<{ retryParties: [] }>();
</script>

<template>
  <div>
    <h2 class="side-head">Case Summary</h2>
    <dl class="m-0">
      <div class="summary-row">
        <dt>Appeal No.</dt>
        <dd>{{ appeal.appealNo || '-' }}</dd>
      </div>
      <div class="summary-row">
        <dt>Appellant</dt>
        <dd>{{ appeal.appellantName }}</dd>
      </div>
      <div class="summary-row">
        <dt>Tax Type</dt>
        <dd>{{ appeal.taxType?.name || '-' }}</dd>
      </div>
      <div class="summary-row">
        <dt>Region</dt>
        <dd>{{ appeal.region?.name || '-' }}</dd>
      </div>
      <div class="summary-row">
        <dt>Filed</dt>
        <dd>{{ formatDate(appeal.dateOfFiling) }}</dd>
      </div>
      <div class="summary-row">
        <dt>Reply Due</dt>
        <dd>{{ formatDate(appeal.replyDueDate) }}</dd>
      </div>
      <div class="summary-row">
        <dt>Status</dt>
        <dd>
          <span class="tra-badge grey">{{ humanize(appeal.statusTrend) }}</span>
        </dd>
      </div>
      <div class="summary-row">
        <dt>Decision</dt>
        <dd>
          <span class="tra-badge" :class="appeal.outcomeOfDecision === 'NO DECISION' ? 'amber' : 'green'">{{
            humanize(appeal.outcomeOfDecision)
          }}</span>
        </dd>
      </div>
    </dl>

    <div class="side-section">
      <h2 class="side-head">Respondents</h2>
      <SectionError v-if="partiesError" compact :message="partiesError" @retry="emit('retryParties')" />
      <template v-else>
        <div v-for="r in parties.respondents" :key="r.id" class="text-sm py-1 flex items-center gap-2">
          <i class="pi pi-building text-tra-yellow-dark text-xs" aria-hidden="true"></i>{{ r.respondent?.name || r.respondentId }}
        </div>
        <div v-if="!parties.respondents.length" class="text-sm text-tra-muted">No respondent records.</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.side-head {
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 10px;
}
.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 0;
  font-size: 13px;
  border-bottom: 1px solid #f1f2f4;
}
.summary-row dt {
  color: var(--tra-muted);
  flex-shrink: 0;
}
.summary-row dd {
  margin: 0;
  font-weight: 700;
  text-align: right;
  min-width: 0;
  overflow-wrap: anywhere;
}
.side-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--tra-border);
}
</style>

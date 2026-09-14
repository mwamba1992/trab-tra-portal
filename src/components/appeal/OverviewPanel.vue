<script setup lang="ts">
import { computed } from 'vue';
import type { AppealDetail, AppealParties, PartyAppellant } from '@/service/tra';
import DecisionPanel from './DecisionPanel.vue';
import SectionError from './SectionError.vue';

const props = defineProps<{ appeal: AppealDetail; parties: AppealParties; partiesError: string }>();
const emit = defineEmits<{ retryParties: [] }>();

const appellantName = (p: PartyAppellant) =>
  [p.appellant?.firstName, p.appellant?.lastName].filter(Boolean).join(' ') || props.appeal.appellantName || '-';

const formatAmount = (v: number | string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v);
};

const particulars = computed(() =>
  [
    { label: 'Nature of appeal', value: props.appeal.natureOfAppeal },
    { label: 'Assessment No.', value: props.appeal.assessmentNo },
    { label: 'Taxed office', value: props.appeal.taxedOffice },
  ].filter((p) => !!p.value),
);
</script>

<template>
  <div>
    <DecisionPanel :appeal="appeal" />

    <h2 class="sec-head">Appellants</h2>
    <SectionError v-if="partiesError" :message="partiesError" @retry="emit('retryParties')" />
    <template v-else>
      <div v-for="p in parties.appellants" :key="p.id" class="party-chip">
        <i class="pi pi-user" aria-hidden="true"></i>{{ appellantName(p) }}
        <span v-if="p.appellant?.tinNumber" class="tin">TIN {{ p.appellant.tinNumber }}</span>
      </div>
      <div v-if="!parties.appellants.length" class="text-sm text-tra-muted">No appellant records.</div>
    </template>

    <template v-if="particulars.length || appeal.amounts?.length || appeal.remarks">
      <h2 class="sec-head mt-5">Particulars</h2>
      <dl class="part-grid">
        <div v-for="p in particulars" :key="p.label">
          <dt>{{ p.label }}</dt>
          <dd>{{ p.value }}</dd>
        </div>
        <div v-if="appeal.amounts?.length">
          <dt>Amount in dispute</dt>
          <dd>
            <div v-for="a in appeal.amounts" :key="a.id">{{ a.currency }} {{ formatAmount(a.amount) }}</div>
          </dd>
        </div>
      </dl>
      <div v-if="appeal.remarks" class="mt-3">
        <div class="lbl">Remarks</div>
        <p class="text-sm text-tra-text whitespace-pre-wrap m-0">{{ appeal.remarks }}</p>
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
  margin: 0 0 10px;
}
.party-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f5f6f7;
  padding: 8px 12px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  margin: 0 8px 8px 0;
}
.tin {
  font-size: 11px;
  font-weight: 600;
  color: var(--tra-muted);
}
.part-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px 20px;
  margin: 0;
}
.part-grid dt,
.lbl {
  font-size: 11px;
  font-weight: 700;
  color: var(--tra-muted);
  text-transform: uppercase;
  margin-bottom: 3px;
}
.part-grid dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--tra-black);
  overflow-wrap: anywhere;
}
</style>

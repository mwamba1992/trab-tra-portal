<script setup lang="ts">
import { computed } from 'vue';
import type { AppealDetail } from '@/service/tra';
import { formatDate, humanize } from '@/utils/format';
import { useStoredFile } from './appealUi';

const props = defineProps<{ appeal: AppealDetail }>();
const { busy, openFile } = useStoredFile();

const decided = computed(() => {
  const a = props.appeal;
  return (!!a.outcomeOfDecision && a.outcomeOfDecision !== 'NO DECISION') || !!a.decidedDate || !!a.judgementFile;
});
const judgementName = computed(
  () => `Judgement-${props.appeal.appealNo || props.appeal.id}${props.appeal.judgementFile?.match(/\.[a-z0-9]+$/i)?.[0] ?? ''}`,
);
</script>

<template>
  <section class="decision" :class="{ pending: !decided }" aria-labelledby="decision-head">
    <h2 id="decision-head" class="sec-head"><i class="pi pi-verified" aria-hidden="true"></i> Board Decision</h2>

    <template v-if="decided">
      <dl class="decision-grid">
        <div>
          <dt>Outcome</dt>
          <dd>
            <span class="tra-badge green">{{ humanize(appeal.outcomeOfDecision) }}</span>
          </dd>
        </div>
        <div>
          <dt>Decision date</dt>
          <dd>{{ formatDate(appeal.decidedDate) }}</dd>
        </div>
        <div>
          <dt>Won by</dt>
          <dd>{{ humanize(appeal.wonBy) }}</dd>
        </div>
        <div v-if="appeal.decidedBy">
          <dt>Decided by</dt>
          <dd>{{ appeal.decidedBy }}</dd>
        </div>
      </dl>
      <div v-if="appeal.summaryOfDecree" class="mt-3">
        <div class="lbl">Summary of decree</div>
        <p class="decree">{{ appeal.summaryOfDecree }}</p>
      </div>
      <div v-if="appeal.judgementFile" class="flex flex-wrap gap-2 mt-3">
        <button type="button" class="tra-btn tra-btn-dark" :disabled="!!busy" @click="openFile(appeal.judgementFile, 'view')">
          <i class="pi" :class="busy === `view:${appeal.judgementFile}` ? 'pi-spin pi-spinner' : 'pi-external-link'" aria-hidden="true"></i>
          View judgement
        </button>
        <button
          type="button"
          class="tra-btn tra-btn-ghost"
          :disabled="!!busy"
          @click="openFile(appeal.judgementFile, 'download', judgementName)"
        >
          <i class="pi" :class="busy === `download:${appeal.judgementFile}` ? 'pi-spin pi-spinner' : 'pi-download'" aria-hidden="true"></i>
          Download
        </button>
      </div>
    </template>
    <p v-else class="text-sm text-tra-muted m-0">
      No decision has been delivered yet.
      <template v-if="appeal.expectedDecisionDate"> Expected by {{ formatDate(appeal.expectedDecisionDate) }}.</template>
    </p>
  </section>
</template>

<style scoped>
.decision {
  border: 1px solid #a6f4c5;
  background: #f6fef9;
  border-radius: 9px;
  padding: 14px 16px;
  margin-bottom: 18px;
}
.decision.pending {
  border-color: var(--tra-border);
  background: #fcfcfd;
}
.sec-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-ink);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 10px;
}
.decision-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px 18px;
  margin: 0;
}
.decision-grid dt,
.lbl {
  font-size: 11px;
  font-weight: 700;
  color: var(--tra-muted);
  text-transform: uppercase;
  margin-bottom: 3px;
}
.decision-grid dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--tra-black);
}
.decree {
  margin: 0;
  font-size: 13px;
  color: var(--tra-text);
  white-space: pre-wrap;
}
.tra-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>

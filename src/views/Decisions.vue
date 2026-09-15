<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import { TraApi, type DecisionActionType, type DecisionItem } from '@/service/tra';
import { useAuthStore } from '@/stores/auth';
import { DECISION_ACTION_OPTIONS, decisionActionBadge, decisionActionProblem } from '@/components/lists/decisionAction';
import { apiErrorMessage } from '@/utils/errors';
import { formatDate, humanize, todayIso } from '@/utils/format';
import { openPreview } from '@/components/files/filePreview';

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const canRecord = computed(() => auth.can('TRA File Reply'));
const table = ref<InstanceType<typeof TraTable> | null>(null);

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

// Recording what TRA did about the decision.
const target = ref<DecisionItem | null>(null);
const form = reactive({ action: 'ASSESSMENT_REVISED' as DecisionActionType, details: '', actionDate: '' });
const saving = ref(false);
const touched = ref(false);
const problem = computed(() => decisionActionProblem(form));

const visible = computed({
  get: () => target.value !== null,
  set: (open: boolean) => {
    if (!open) target.value = null;
  },
});

const openAction = (d: DecisionItem) => {
  const existing = d.decisionAction;
  form.action = existing?.action ?? 'ASSESSMENT_REVISED';
  form.details = existing?.details ?? '';
  form.actionDate = existing?.actionDate ?? todayIso();
  touched.value = false;
  target.value = d;
};

const save = async () => {
  touched.value = true;
  if (!target.value || problem.value) return;
  saving.value = true;
  try {
    await TraApi.setDecisionAction(target.value.id, {
      action: form.action,
      details: form.details.trim() || undefined,
      actionDate: form.actionDate || undefined,
    });
    toast.add({ severity: 'success', summary: 'Recorded', detail: 'Action recorded against the decision', life: 3000 });
    target.value = null;
    table.value?.load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Not saved', detail: apiErrorMessage(e, 'The action could not be recorded'), life: 4500 });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Decisions" :crumbs="['Tax Appeals', 'Decisions']" />
    <p class="text-sm text-tra-muted -mt-2 mb-4">
      Board decisions delivered to TRA. Record what TRA did about each one, or consider an onward appeal to the Tribunal.
    </p>

    <div class="tra-card tra-card-pad">
      <TraTable ref="table" :fetch="TraApi.decisions" dataKey="id" clickable errorTitle="Could not load decisions" @row-click="openAppeal">
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
        <Column header="TRA Action">
          <template #body="{ data }">
            <span class="tra-badge" :class="decisionActionBadge(data.decisionAction).cls">{{
              decisionActionBadge(data.decisionAction).text
            }}</span>
            <div v-if="data.decisionAction?.actionDate" class="text-xs text-tra-muted mt-1">
              {{ formatDate(data.decisionAction.actionDate) }}
            </div>
            <button v-if="canRecord" type="button" class="more-btn" @click="openAction(data)">
              {{ data.decisionAction ? 'Update' : 'Record action' }}
            </button>
          </template>
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

    <Dialog v-model:visible="visible" modal header="Record TRA's Action" :style="{ width: 'min(620px, 96vw)' }">
      <form v-if="target" class="flex flex-col gap-4" @submit.prevent="save">
        <p class="text-sm m-0">
          <strong>{{ target.appealNo || 'Appeal' }}</strong> · {{ target.appellantName }} · decided {{ formatDate(target.decidedDate) }}
          <template v-if="target.wonBy"> · won by {{ humanize(target.wonBy).toLowerCase() }}</template>
        </p>

        <fieldset class="choices">
          <legend class="fld-label">What did TRA do?</legend>
          <label v-for="o in DECISION_ACTION_OPTIONS" :key="o.value" class="choice" :class="{ active: form.action === o.value }">
            <input v-model="form.action" type="radio" name="decision-action" :value="o.value" />
            <span>{{ o.label }}</span>
          </label>
        </fieldset>

        <div>
          <label for="action-details" class="fld-label">
            {{ form.action === 'NO_ACTION_REQUIRED' ? 'Remarks (optional)' : 'Details (required)' }}
          </label>
          <textarea
            id="action-details"
            v-model="form.details"
            rows="3"
            class="fld"
            maxlength="4000"
            placeholder="e.g. Refund of TZS 12,400,000 paid on voucher 88231"
          ></textarea>
        </div>

        <div>
          <label for="action-date" class="fld-label">Date of the action (optional)</label>
          <input id="action-date" v-model="form.actionDate" type="date" class="fld" />
        </div>

        <p v-if="touched && problem" class="form-error" role="alert">{{ problem }}</p>

        <div class="flex justify-end gap-2">
          <button type="button" class="tra-btn tra-btn-ghost" :disabled="saving" @click="target = null">Cancel</button>
          <button type="submit" class="tra-btn tra-btn-dark" :disabled="saving">
            <i class="pi" :class="saving ? 'pi-spin pi-spinner' : 'pi-check'" aria-hidden="true"></i> Save
          </button>
        </div>
      </form>
    </Dialog>
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
.fld-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-ink);
  margin-bottom: 6px;
}
.fld {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: vertical;
}
.fld:focus {
  border-color: var(--tra-yellow);
  box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.2);
}
.choices {
  border: 0;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.choice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--tra-border);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.choice.active {
  border-color: var(--tra-yellow-dark);
  background: #fffaeb;
}
.choice input:focus-visible {
  outline: 2px solid var(--tra-yellow-dark);
  outline-offset: 2px;
}
.form-error {
  margin: 0;
  font-size: 13px;
  color: var(--tra-danger);
}
.tra-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>

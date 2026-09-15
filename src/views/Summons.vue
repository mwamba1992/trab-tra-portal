<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import { TraApi, type Attendance, type SummonsItem } from '@/service/tra';
import { useAuthStore } from '@/stores/auth';
import { ATTENDANCE_OPTIONS, hearingResponseBadge, hearingResponseProblem } from '@/components/lists/hearingResponse';
import { apiErrorMessage } from '@/utils/errors';
import { formatDate, humanize } from '@/utils/format';

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const canRespond = computed(() => auth.can('TRA File Reply'));
const table = ref<InstanceType<typeof TraTable> | null>(null);

const statusClass = (s: string | undefined) => (s === 'SERVED' ? 'green' : s === 'CONCLUDED' ? 'grey' : 'amber');
const openAppeal = (row: object) => router.push(`/appeals/${(row as SummonsItem).appealId}`);

// Response dialog
const target = ref<SummonsItem | null>(null);
const form = reactive({ attendance: 'ATTENDING' as Attendance, appearingCounsel: '', witnesses: '', remarks: '' });
const saving = ref(false);
const touched = ref(false);
const problem = computed(() => hearingResponseProblem(form));

const visible = computed({
  get: () => target.value !== null,
  set: (open: boolean) => {
    if (!open) target.value = null;
  },
});

const openResponse = (item: SummonsItem) => {
  const r = item.response;
  form.attendance = r?.attendance ?? 'ATTENDING';
  form.appearingCounsel = r?.appearingCounsel ?? '';
  form.witnesses = r?.witnesses ?? '';
  form.remarks = r?.remarks ?? '';
  touched.value = false;
  target.value = item;
};

const save = async () => {
  touched.value = true;
  if (!target.value || problem.value) return;
  saving.value = true;
  try {
    await TraApi.respondToHearing(target.value.summonsAppealId, {
      attendance: form.attendance,
      appearingCounsel: form.appearingCounsel.trim() || undefined,
      witnesses: form.witnesses.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
    });
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Hearing response sent to the Board', life: 3000 });
    target.value = null;
    table.value?.load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Not saved', detail: apiErrorMessage(e, 'The response could not be saved'), life: 4500 });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Summons" :crumbs="['Tax Appeals', 'Summons']" />
    <p class="text-sm text-tra-muted -mt-2 mb-4">
      Hearing summons served on TRA. Confirm attendance and the appearing counsel, or request an adjournment.
    </p>

    <div class="tra-card tra-card-pad">
      <TraTable
        ref="table"
        :fetch="TraApi.summons"
        dataKey="summonsAppealId"
        clickable
        errorTitle="Could not load summons"
        @row-click="openAppeal"
      >
        <Column header="Appeal No.">
          <template #body="{ data }">
            <router-link :to="`/appeals/${data.appealId}`" class="row-link">{{ data.appealNo || 'No number yet' }}</router-link>
            <div class="text-xs text-tra-muted">{{ data.appellantName || '-' }}</div>
          </template>
        </Column>
        <Column header="Hearing">
          <template #body="{ data }">
            <div>
              {{ formatDate(data.summons?.startDate)
              }}<span v-if="data.summons?.time" class="text-tra-muted"> · {{ data.summons.time }}</span>
            </div>
            <div class="text-xs text-tra-muted">{{ data.summons?.venue || '-' }}</div>
          </template>
        </Column>
        <Column header="Panel"
          ><template #body="{ data }">{{ data.summons?.judge?.name || '-' }}</template></Column
        >
        <Column header="Status">
          <template #body="{ data }"
            ><span class="tra-badge" :class="statusClass(data.summons?.status)">{{ humanize(data.summons?.status) }}</span></template
          >
        </Column>
        <Column header="TRA Response">
          <template #body="{ data }">
            <span class="tra-badge" :class="hearingResponseBadge(data.response, data.summons?.status).cls">{{
              hearingResponseBadge(data.response, data.summons?.status).text
            }}</span>
            <div v-if="data.response?.appearingCounsel" class="text-xs text-tra-muted mt-1">{{ data.response.appearingCounsel }}</div>
          </template>
        </Column>
        <Column v-if="canRespond" header="">
          <template #body="{ data }">
            <button v-if="data.summons?.status !== 'CONCLUDED'" type="button" class="tra-btn tra-btn-ghost" @click="openResponse(data)">
              {{ data.response ? 'Update' : 'Respond' }}
            </button>
          </template>
        </Column>
        <template #empty
          ><div class="tra-empty"><i class="pi pi-calendar"></i>No summons served on TRA.</div></template
        >
      </TraTable>
    </div>

    <Dialog v-model:visible="visible" modal header="Respond to Summons" :style="{ width: 'min(620px, 96vw)' }">
      <form v-if="target" class="flex flex-col gap-4" @submit.prevent="save">
        <p class="text-sm m-0">
          <strong>{{ target.appealNo || 'Appeal' }}</strong> · {{ target.appellantName || '-' }} · hearing
          {{ formatDate(target.summons?.startDate) }}<template v-if="target.summons?.venue"> at {{ target.summons.venue }}</template>
        </p>

        <fieldset class="choices">
          <legend class="fld-label">Attendance</legend>
          <label v-for="o in ATTENDANCE_OPTIONS" :key="o.value" class="choice" :class="{ active: form.attendance === o.value }">
            <input v-model="form.attendance" type="radio" name="attendance" :value="o.value" />
            <span>{{ o.label }}</span>
          </label>
        </fieldset>

        <div v-if="form.attendance === 'ATTENDING'">
          <label for="counsel" class="fld-label">Appearing counsel or officer (required)</label>
          <input
            id="counsel"
            v-model="form.appearingCounsel"
            class="fld"
            maxlength="1000"
            placeholder="e.g. Adv. Jane Mushi, TRA Legal Services"
          />
        </div>
        <div v-if="form.attendance === 'ATTENDING'">
          <label for="witnesses" class="fld-label">Witnesses (optional)</label>
          <textarea
            id="witnesses"
            v-model="form.witnesses"
            rows="3"
            class="fld"
            maxlength="4000"
            placeholder="One witness per line"
          ></textarea>
        </div>
        <div>
          <label for="remarks" class="fld-label">{{ form.attendance === 'ATTENDING' ? 'Remarks (optional)' : 'Reason (required)' }}</label>
          <textarea
            id="remarks"
            v-model="form.remarks"
            rows="3"
            class="fld"
            maxlength="4000"
            :placeholder="form.attendance === 'ADJOURNMENT_REQUESTED' ? 'Why TRA seeks an adjournment…' : 'Anything the Board should know…'"
          ></textarea>
        </div>

        <p v-if="touched && problem" class="form-error" role="alert">{{ problem }}</p>

        <div class="flex justify-end gap-2">
          <button type="button" class="tra-btn tra-btn-ghost" :disabled="saving" @click="target = null">Cancel</button>
          <button type="submit" class="tra-btn tra-btn-dark" :disabled="saving">
            <i class="pi" :class="saving ? 'pi-spin pi-spinner' : 'pi-send'" aria-hidden="true"></i> Send to Board
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
.row-link:focus-visible {
  outline: 2px solid var(--tra-yellow-dark);
  outline-offset: 2px;
  border-radius: 3px;
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

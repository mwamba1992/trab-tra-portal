<script setup lang="ts">
import { ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { TraApi, type Appeal, type AppealDetail, type CaseAssignment, type Officer } from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';
import { humanize } from '@/utils/format';
import SectionError from './SectionError.vue';
import { formatDateTime } from './appealUi';

const props = defineProps<{
  appeal: AppealDetail;
  canAssign: boolean;
  officers: Officer[];
  assignments: CaseAssignment[];
  officersError: string;
  assignmentsError: string;
}>();
const emit = defineEmits<{ changed: [appeal: Appeal]; retryOfficers: []; retryAssignments: [] }>();

const toast = useToast();
const selectedOfficer = ref(props.appeal.assignedOfficerId || '');
const assigning = ref(false);
const showHistory = ref(false);

watch(
  () => props.appeal.assignedOfficerId,
  (v) => {
    selectedOfficer.value = v || '';
  },
);

const assign = async () => {
  if (!selectedOfficer.value) return;
  assigning.value = true;
  try {
    emit('changed', await TraApi.assign(props.appeal.id, selectedOfficer.value));
    toast.add({ severity: 'success', summary: 'Assigned', detail: 'Case assigned to officer', life: 3000 });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Assignment failed',
      detail: apiErrorMessage(e, 'The case could not be assigned.'),
      life: 4000,
    });
  } finally {
    assigning.value = false;
  }
};

const unassign = async () => {
  assigning.value = true;
  try {
    emit('changed', await TraApi.unassign(props.appeal.id));
    selectedOfficer.value = '';
    toast.add({ severity: 'success', summary: 'Unassigned', detail: 'Case unassigned', life: 3000 });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Unassign failed',
      detail: apiErrorMessage(e, 'The case could not be unassigned.'),
      life: 4000,
    });
  } finally {
    assigning.value = false;
  }
};
</script>

<template>
  <div class="side-section">
    <h2 class="side-head">Handling Officer</h2>
    <div class="flex items-center gap-2 mb-2">
      <i class="pi pi-user-edit text-tra-yellow-dark text-xs" aria-hidden="true"></i>
      <span v-if="appeal.assignedOfficerName" class="text-sm font-semibold text-tra-black">{{ appeal.assignedOfficerName }}</span>
      <span v-else class="tra-badge amber">Unassigned</span>
    </div>

    <template v-if="canAssign">
      <SectionError v-if="officersError" compact :message="officersError" @retry="emit('retryOfficers')" />
      <div v-else class="flex flex-col gap-2">
        <label for="assign-officer" class="sr-only">Assign to officer</label>
        <select id="assign-officer" v-model="selectedOfficer" class="fld-sm" :disabled="assigning">
          <option value="">Select officer…</option>
          <option v-for="o in officers" :key="o.id" :value="o.id">{{ o.firstName }} {{ o.lastName }}</option>
        </select>
        <div class="flex gap-2">
          <button
            type="button"
            class="tra-btn tra-btn-dark flex-1 justify-center"
            :disabled="assigning || !selectedOfficer || selectedOfficer === appeal.assignedOfficerId"
            @click="assign"
          >
            <i class="pi" :class="assigning ? 'pi-spin pi-spinner' : 'pi-check'" aria-hidden="true"></i> Assign
          </button>
          <button
            v-if="appeal.assignedOfficerId"
            v-tooltip.top="'Unassign'"
            type="button"
            class="tra-btn tra-btn-ghost"
            :disabled="assigning"
            aria-label="Unassign officer"
            @click="unassign"
          >
            <i class="pi pi-times" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <!-- Assignment history -->
      <div class="mt-3">
        <SectionError v-if="assignmentsError" compact :message="assignmentsError" @retry="emit('retryAssignments')" />
        <template v-else-if="assignments.length">
          <button
            type="button"
            class="hist-toggle"
            :aria-expanded="showHistory"
            aria-controls="assign-history"
            @click="showHistory = !showHistory"
          >
            <i class="pi" :class="showHistory ? 'pi-chevron-down' : 'pi-chevron-right'" aria-hidden="true"></i>
            Assignment history ({{ assignments.length }})
          </button>
          <ul v-show="showHistory" id="assign-history" class="hist-list">
            <li v-for="h in assignments" :key="h.id" class="hist-row">
              <span class="tra-badge" :class="h.action === 'UNASSIGNED' ? 'red' : 'gold'">{{ humanize(h.action) }}</span>
              <div class="hist-body">
                <span v-if="h.action === 'UNASSIGNED'">{{ h.previousOfficerName || '-' }} removed</span>
                <span v-else-if="h.action === 'REASSIGNED'"
                  >{{ h.previousOfficerName || '-' }} → <strong>{{ h.officerName }}</strong></span
                >
                <span v-else
                  ><strong>{{ h.officerName }}</strong></span
                >
                <div class="hist-meta">{{ h.changedByName || 'System' }} · {{ formatDateTime(h.createdAt) }}</div>
              </div>
            </li>
          </ul>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.side-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--tra-border);
}
.side-head {
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 8px;
}
.fld-sm {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 7px;
  font-size: 13px;
  outline: none;
  background: #fff;
}
.fld-sm:focus {
  border-color: var(--tra-yellow);
  box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.2);
}
.tra-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.hist-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-muted);
  cursor: pointer;
  background: none;
  border: 0;
  padding: 0;
}
.hist-toggle:hover {
  color: var(--tra-black);
}
.hist-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
.hist-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid #f1f2f4;
}
.hist-body {
  font-size: 12px;
  color: var(--tra-ink);
  min-width: 0;
}
.hist-meta {
  font-size: 11px;
  color: var(--tra-muted);
  margin-top: 2px;
}
</style>

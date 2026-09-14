<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Column from 'primevue/column';
import { TraApi, type Appeal } from '@/service/tra';
import { useAuthStore } from '@/stores/auth';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';

const router = useRouter();
const auth = useAuthStore();
const table = ref<InstanceType<typeof TraTable> | null>(null);
const total = ref(0);

// Scope: supervisors default to all cases, officers to their own.
const scope = ref<'mine' | 'all'>(auth.isAdmin ? 'all' : 'mine');
const overdueOnly = ref(false);

// Filters (client-side over the loaded page — matches IDRAS search feel)
const fAppealNo = ref('');
const fAppellant = ref('');
const fReply = ref<'' | 'filed' | 'pending'>('');

// Server fetch — reads the live scope/overdue on each call.
const fetchAppeals = (page: number, size: number) =>
  TraApi.appeals({ page, size, scope: scope.value, overdue: overdueOnly.value });

// Client-side quick filter applied to the current page.
const applyFilter = (rows: Appeal[]) =>
  rows.filter(
    (a) =>
      (!fAppealNo.value || (a.appealNo || '').toLowerCase().includes(fAppealNo.value.toLowerCase())) &&
      (!fAppellant.value || a.appellantName.toLowerCase().includes(fAppellant.value.toLowerCase())) &&
      (!fReply.value || (fReply.value === 'filed' ? a.traReplied : !a.traReplied)),
  );

const reload = () => table.value?.reload();
const setScope = (s: 'mine' | 'all') => { scope.value = s; reload(); };
const toggleOverdue = () => { overdueOnly.value = !overdueOnly.value; reload(); };

const reset = () => {
  fAppealNo.value = '';
  fAppellant.value = '';
  fReply.value = '';
};

// Reply-deadline badge for the "Due" column.
const dueBadge = (a: Appeal): { cls: string; text: string } => {
  if (a.traReplied) return { cls: 'green', text: 'Replied' };
  if (a.overdue) return { cls: 'red', text: 'Overdue' };
  if (a.daysRemaining != null) return { cls: a.daysRemaining <= 7 ? 'amber' : 'grey', text: `${a.daysRemaining}d left` };
  return { cls: 'grey', text: '—' };
};

const exportCsv = () => {
  const data = applyFilter((table.value?.items as Appeal[]) ?? []);
  if (!data.length) return;
  const head = ['Appeal No', 'Appellant', 'Tax Type', 'Filed', 'Assignee', 'Reply Due', 'Reply', 'Status'];
  const body = data.map((a) => [a.appealNo, a.appellantName, a.taxType?.name, a.dateOfFiling, a.assignedOfficerName || 'Unassigned', a.replyDueDate, a.traReplied ? 'Filed' : 'Pending', a.statusTrend]);
  const csv = [head, ...body].map((r) => r.join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'appeals-against-tra.csv'; a.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div>
    <PageHeader title="Appeals Against TRA" :crumbs="['Tax Appeals', 'Appeals']">
      <template #actions>
        <button class="tra-btn tra-btn-ghost" @click="exportCsv"><i class="pi pi-file-excel"></i> Export</button>
      </template>
    </PageHeader>

    <!-- Scope + quick filters -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <div class="tra-seg">
        <button class="seg" :class="{ active: scope==='mine' }" @click="setScope('mine')"><i class="pi pi-user"></i> My Cases</button>
        <button class="seg" :class="{ active: scope==='all' }" @click="setScope('all')"><i class="pi pi-briefcase"></i> All Cases</button>
      </div>
      <button class="tra-chip" :class="{ 'chip-on': overdueOnly }" @click="toggleOverdue">
        <i class="pi pi-exclamation-triangle"></i> Overdue only
      </button>
    </div>

    <!-- Filter card -->
    <div class="tra-card tra-card-pad mb-4">
      <div class="tra-filter-grid">
        <div class="tra-field">
          <label>Appeal Number</label>
          <input class="fld" v-model="fAppealNo" placeholder="e.g. APP/001/2026" />
        </div>
        <div class="tra-field">
          <label>Appellant</label>
          <input class="fld" v-model="fAppellant" placeholder="Company / taxpayer name" />
        </div>
        <div class="tra-field">
          <label>Reply Status</label>
          <select class="fld" v-model="fReply">
            <option value="">All</option>
            <option value="pending">Pending Reply</option>
            <option value="filed">Reply Filed</option>
          </select>
        </div>
        <div class="tra-field">
          <label>Quick Range</label>
          <div class="tra-quickrange">
            <button class="tra-chip">-1W</button>
            <button class="tra-chip">-1M</button>
            <button class="tra-chip">-3M</button>
            <button class="tra-chip">-6M</button>
            <button class="tra-chip">-1Y</button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 mt-4 pt-4" style="border-top:1px solid var(--tra-border)">
        <button class="tra-btn tra-btn-ghost" @click="reset"><i class="pi pi-refresh"></i> Reset</button>
        <button class="tra-btn tra-btn-dark" @click="reload"><i class="pi pi-search"></i> Search</button>
        <span class="ml-auto text-xs text-tra-muted">Total: <strong class="text-tra-black">{{ total }}</strong></span>
      </div>
    </div>

    <!-- Grid -->
    <div class="tra-card tra-card-pad">
      <TraTable
        ref="table"
        :fetch="fetchAppeals"
        :filter="applyFilter"
        dataKey="id"
        clickable
        @loaded="(d) => (total = d.total)"
        @row-click="(row) => router.push(`/appeals/${row.id}`)"
      >
        <template #default="{ page, size }">
          <Column header="S/N" style="width:3.5rem">
            <template #body="{ index }">{{ (page - 1) * size + index + 1 }}</template>
          </Column>
          <Column field="appealNo" header="Appeal No.">
            <template #body="{ data }"><span class="font-bold text-tra-ink">{{ data.appealNo || '—' }}</span></template>
          </Column>
          <Column field="appellantName" header="Appellant" />
          <Column header="Tax Type"><template #body="{ data }">{{ data.taxType?.name || '—' }}</template></Column>
          <Column header="Assignee">
            <template #body="{ data }">
              <span v-if="data.assignedOfficerName" class="text-sm text-tra-ink">{{ data.assignedOfficerName }}</span>
              <span v-else class="tra-badge amber">Unassigned</span>
            </template>
          </Column>
          <Column field="dateOfFiling" header="Filed" />
          <Column header="Reply Due">
            <template #body="{ data }">
              <span class="tra-badge" :class="dueBadge(data).cls" v-tooltip.top="data.replyDueDate || ''">{{ dueBadge(data).text }}</span>
            </template>
          </Column>
          <Column header="Status"><template #body="{ data }"><span class="tra-badge grey">{{ data.statusTrend }}</span></template></Column>
          <Column header="" style="width:3rem">
            <template #body><i class="pi pi-angle-right text-tra-muted"></i></template>
          </Column>
        </template>
        <template #empty><div class="tra-empty"><i class="pi pi-inbox"></i>No appeals match your filters.</div></template>
      </TraTable>
    </div>
  </div>
</template>

<style scoped>
.fld {
  width: 100%; height: 38px; padding: 0 12px;
  border: 1px solid var(--tra-border-strong); border-radius: 7px; font-size: 13px; outline: none; background: #fff;
}
.fld:focus { border-color: var(--tra-yellow); box-shadow: 0 0 0 3px rgba(245,196,0,0.2); }
.tra-seg { display: inline-flex; border: 1px solid var(--tra-border-strong); border-radius: 8px; overflow: hidden; background: #fff; }
.seg { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 13px; font-weight: 700; color: var(--tra-muted); }
.seg.active { background: var(--tra-black); color: #fff; }
.chip-on { background: var(--tra-yellow); border-color: var(--tra-yellow-dark); color: var(--tra-black); font-weight: 700; }
</style>

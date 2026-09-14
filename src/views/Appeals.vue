<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQuery } from 'vue-router';
import Column from 'primevue/column';
import { useToast } from 'primevue/usetoast';
import { TraApi, type Appeal, type AppealQuery, type Officer } from '@/service/tra';
import { useAuthStore } from '@/stores/auth';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import { replyBadge } from '@/components/lists/replyStatus';
import { downloadCsv, formatDate, humanize, isoDate, todayIso } from '@/utils/format';
import { apiErrorMessage } from '@/utils/errors';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const table = ref<InstanceType<typeof TraTable> | null>(null);
const total = ref(0);

const STATUSES = ['NEW', 'HEARING_SCHEDULED', 'CONCLUDED', 'DECIDED'];
type RangeKey = '1W' | '1M' | '3M' | '6M' | '1Y';
const RANGES: { key: RangeKey; label: string; title: string }[] = [
  { key: '1W', label: '-1W', title: 'Filed in the last week' },
  { key: '1M', label: '-1M', title: 'Filed in the last month' },
  { key: '3M', label: '-3M', title: 'Filed in the last 3 months' },
  { key: '6M', label: '-6M', title: 'Filed in the last 6 months' },
  { key: '1Y', label: '-1Y', title: 'Filed in the last year' },
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Filter state (all applied server-side) ───
const defaultScope = (): 'mine' | 'all' => (auth.isAdmin ? 'all' : 'mine');
const scope = ref<'mine' | 'all'>(defaultScope());
const overdueOnly = ref(false);
const searchDraft = ref('');
const search = ref('');
const reply = ref<'' | 'filed' | 'pending'>('');
const status = ref('');
const officerId = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const range = ref<RangeKey | ''>('');

const canPickOfficer = computed(() => auth.isAdmin && auth.can('TRA Manage Users'));
const officers = ref<Officer[]>([]);

const rangeStart = (key: RangeKey): string => {
  const d = new Date();
  if (key === '1W') d.setDate(d.getDate() - 7);
  else d.setMonth(d.getMonth() - { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[key]);
  return isoDate(d);
};

const first = (v: unknown): string => {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === 'string' ? x : '';
};
const queryKey = (q: Record<string, unknown>) =>
  JSON.stringify(
    Object.keys(q)
      .sort()
      .map((k) => [k, first(q[k])])
      .filter(([, v]) => v),
  );

// URL query <-> filters, so dashboard tiles can deep-link (e.g. /appeals?overdue=1).
const readQuery = (q: LocationQuery) => {
  const s = first(q.scope);
  scope.value = s === 'mine' || s === 'all' ? s : defaultScope();
  overdueOnly.value = ['1', 'true'].includes(first(q.overdue));
  const r = first(q.reply);
  reply.value = r === 'filed' || r === 'pending' ? r : '';
  const st = first(q.status);
  status.value = STATUSES.includes(st) ? st : '';
  officerId.value = first(q.officer);
  search.value = first(q.q).trim();
  searchDraft.value = search.value;
  const rk = RANGES.find((x) => x.key === first(q.range))?.key ?? '';
  range.value = rk;
  if (rk) {
    dateFrom.value = rangeStart(rk);
    dateTo.value = todayIso();
  } else {
    dateFrom.value = ISO_DATE.test(first(q.from)) ? first(q.from) : '';
    dateTo.value = ISO_DATE.test(first(q.to)) ? first(q.to) : '';
  }
};

const buildQuery = (): Record<string, string> => {
  const q: Record<string, string> = {};
  if (scope.value !== defaultScope()) q.scope = scope.value;
  if (overdueOnly.value) q.overdue = '1';
  if (reply.value) q.reply = reply.value;
  if (status.value) q.status = status.value;
  if (scope.value === 'all' && officerId.value) q.officer = officerId.value;
  if (search.value) q.q = search.value;
  if (range.value) q.range = range.value;
  else {
    if (dateFrom.value) q.from = dateFrom.value;
    if (dateTo.value) q.to = dateTo.value;
  }
  return q;
};

readQuery(route.query);
let lastKey = queryKey(route.query);

const params = (): AppealQuery => ({
  scope: scope.value,
  overdue: overdueOnly.value,
  search: search.value || undefined,
  reply: reply.value || undefined,
  status: status.value || undefined,
  officerId: scope.value === 'all' ? officerId.value || undefined : undefined,
  dateFrom: dateFrom.value || undefined,
  dateTo: dateTo.value || undefined,
});

const fetchAppeals = (page: number, size: number) => TraApi.appeals({ ...params(), page, size });

// Apply the current filters: sync the URL and reload from page 1.
const apply = () => {
  search.value = searchDraft.value.trim();
  const q = buildQuery();
  lastKey = queryKey(q);
  router.replace({ query: q });
  table.value?.reload();
};

// Back/forward or a link to /appeals with different query params while already here.
watch(
  () => route.query,
  (q) => {
    if (route.name !== 'Appeals' || queryKey(q) === lastKey) return;
    readQuery(q);
    lastKey = queryKey(q);
    table.value?.reload();
  },
);

const setScope = (s: 'mine' | 'all') => {
  scope.value = s;
  apply();
};
const toggleOverdue = () => {
  overdueOnly.value = !overdueOnly.value;
  apply();
};
const setRange = (key: RangeKey) => {
  if (range.value === key) {
    range.value = '';
    dateFrom.value = '';
    dateTo.value = '';
  } else {
    range.value = key;
    dateFrom.value = rangeStart(key);
    dateTo.value = todayIso();
  }
  apply();
};
const onDateChange = () => {
  range.value = '';
  apply();
};

const reset = () => {
  searchDraft.value = '';
  reply.value = '';
  status.value = '';
  officerId.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  range.value = '';
  overdueOnly.value = false;
  apply();
};

const openAppeal = (row: object) => router.push(`/appeals/${(row as Appeal).id}`);

// ─── CSV export: every matching row, not just the visible page ───
const exporting = ref(false);
const EXPORT_PAGE = 500;
const exportCsv = async () => {
  exporting.value = true;
  try {
    const rows: Appeal[] = [];
    for (let page = 1; ; page++) {
      const res = await TraApi.appeals({ ...params(), page, size: EXPORT_PAGE });
      rows.push(...res.items);
      if (!res.items.length || rows.length >= res.total) break;
    }
    if (!rows.length) {
      toast.add({ severity: 'info', summary: 'Nothing to export', detail: 'No appeals match your filters.', life: 3000 });
      return;
    }
    downloadCsv(
      `appeals-against-tra-${todayIso()}.csv`,
      ['Appeal No', 'Appellant', 'Tax Type', 'Filed', 'Assignee', 'Reply Due', 'Reply', 'Status'],
      rows.map((a) => [
        a.appealNo,
        a.appellantName,
        a.taxType?.name,
        formatDate(a.dateOfFiling),
        a.assignedOfficerName || 'Unassigned',
        formatDate(a.replyDueDate),
        replyBadge(a).text,
        humanize(a.statusTrend),
      ]),
    );
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Export failed', detail: apiErrorMessage(e), life: 5000 });
  } finally {
    exporting.value = false;
  }
};

onMounted(async () => {
  if (!canPickOfficer.value) return;
  try {
    officers.value = (await TraApi.officers(1, 100)).items;
  } catch (e) {
    toast.add({ severity: 'warn', summary: 'Officer list unavailable', detail: apiErrorMessage(e), life: 4000 });
  }
});
</script>

<template>
  <div>
    <PageHeader title="Appeals Against TRA" :crumbs="['Tax Appeals', 'Appeals']">
      <template #actions>
        <button type="button" class="tra-btn tra-btn-ghost" :disabled="exporting" @click="exportCsv">
          <i class="pi" :class="exporting ? 'pi-spin pi-spinner' : 'pi-file-excel'"></i> Export
        </button>
      </template>
    </PageHeader>

    <!-- Scope + quick filters -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <div class="tra-seg" role="group" aria-label="Case scope">
        <button type="button" class="seg" :class="{ active: scope === 'mine' }" :aria-pressed="scope === 'mine'" @click="setScope('mine')">
          <i class="pi pi-user"></i> My Cases
        </button>
        <button type="button" class="seg" :class="{ active: scope === 'all' }" :aria-pressed="scope === 'all'" @click="setScope('all')">
          <i class="pi pi-briefcase"></i> All Cases
        </button>
      </div>
      <button type="button" class="tra-chip" :class="{ 'chip-on': overdueOnly }" :aria-pressed="overdueOnly" @click="toggleOverdue">
        <i class="pi pi-exclamation-triangle"></i> Overdue only
      </button>
    </div>

    <!-- Filter card -->
    <form class="tra-card tra-card-pad mb-4" @submit.prevent="apply">
      <div class="tra-filter-grid">
        <div class="tra-field">
          <label for="f-search">Search</label>
          <input id="f-search" v-model="searchDraft" class="fld" type="search" placeholder="Appeal number or appellant name" />
        </div>
        <div class="tra-field">
          <label for="f-reply">Reply Status</label>
          <select id="f-reply" v-model="reply" class="fld" @change="apply">
            <option value="">All</option>
            <option value="pending">Pending Reply</option>
            <option value="filed">Reply Filed</option>
          </select>
        </div>
        <div class="tra-field">
          <label for="f-status">Case Status</label>
          <select id="f-status" v-model="status" class="fld" @change="apply">
            <option value="">All</option>
            <option v-for="s in STATUSES" :key="s" :value="s">{{ humanize(s) }}</option>
          </select>
        </div>
        <div v-if="canPickOfficer && scope === 'all'" class="tra-field">
          <label for="f-officer">Assignee</label>
          <select id="f-officer" v-model="officerId" class="fld" @change="apply">
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            <option v-for="o in officers" :key="o.id" :value="o.id">{{ o.firstName }} {{ o.lastName }}</option>
          </select>
        </div>
        <div class="tra-field">
          <label for="f-from">Filed Between</label>
          <div class="flex items-center gap-2">
            <input
              id="f-from"
              v-model="dateFrom"
              class="fld"
              type="date"
              :max="dateTo || undefined"
              aria-label="Filed from"
              @change="onDateChange"
            />
            <span class="text-tra-muted text-xs">to</span>
            <input v-model="dateTo" class="fld" type="date" :min="dateFrom || undefined" aria-label="Filed to" @change="onDateChange" />
          </div>
        </div>
        <div class="tra-field">
          <span class="field-label">Quick Range</span>
          <div class="tra-quickrange" role="group" aria-label="Quick filed-date range">
            <button
              v-for="r in RANGES"
              :key="r.key"
              type="button"
              class="tra-chip"
              :class="{ 'chip-on': range === r.key }"
              :aria-pressed="range === r.key"
              :title="r.title"
              @click="setRange(r.key)"
            >
              {{ r.label }}
            </button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 mt-4 pt-4" style="border-top: 1px solid var(--tra-border)">
        <button type="button" class="tra-btn tra-btn-ghost" @click="reset"><i class="pi pi-refresh"></i> Reset</button>
        <button type="submit" class="tra-btn tra-btn-dark"><i class="pi pi-search"></i> Search</button>
        <span class="ml-auto text-xs text-tra-muted"
          >Total: <strong class="text-tra-black">{{ total }}</strong></span
        >
      </div>
    </form>

    <!-- Grid -->
    <div class="tra-card tra-card-pad">
      <TraTable
        ref="table"
        :fetch="fetchAppeals"
        dataKey="id"
        clickable
        errorTitle="Could not load appeals"
        @loaded="(d) => (total = d.total)"
        @row-click="openAppeal"
      >
        <template #default="{ page, size }">
          <Column header="S/N" style="width: 3.5rem">
            <template #body="{ index }">{{ (page - 1) * size + index + 1 }}</template>
          </Column>
          <Column field="appealNo" header="Appeal No.">
            <template #body="{ data }">
              <router-link :to="`/appeals/${data.id}`" class="row-link">{{ data.appealNo || 'No number yet' }}</router-link>
            </template>
          </Column>
          <Column field="appellantName" header="Appellant" />
          <Column header="Tax Type"
            ><template #body="{ data }">{{ data.taxType?.name || '-' }}</template></Column
          >
          <Column header="Assignee">
            <template #body="{ data }">
              <span v-if="data.assignedOfficerName" class="text-sm text-tra-ink">{{ data.assignedOfficerName }}</span>
              <span v-else class="tra-badge amber">Unassigned</span>
            </template>
          </Column>
          <Column header="Filed"
            ><template #body="{ data }">{{ formatDate(data.dateOfFiling) }}</template></Column
          >
          <Column header="Reply">
            <template #body="{ data }">
              <span class="tra-badge" :class="replyBadge(data).cls" :title="replyBadge(data).title || undefined">{{
                replyBadge(data).text
              }}</span>
            </template>
          </Column>
          <Column header="Status"
            ><template #body="{ data }"
              ><span class="tra-badge grey">{{ humanize(data.statusTrend) }}</span></template
            ></Column
          >
          <Column header="" style="width: 3rem">
            <template #body><i class="pi pi-angle-right text-tra-muted" aria-hidden="true"></i></template>
          </Column>
        </template>
        <template #empty
          ><div class="tra-empty"><i class="pi pi-inbox"></i>No appeals match your filters.</div></template
        >
      </TraTable>
    </div>
  </div>
</template>

<style scoped>
.field-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--tra-ink);
}
.tra-seg {
  display: inline-flex;
  border: 1px solid var(--tra-border-strong);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.seg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  color: var(--tra-muted);
}
.seg.active {
  background: var(--tra-black);
  color: #fff;
}
.chip-on {
  background: var(--tra-yellow);
  border-color: var(--tra-yellow-dark);
  color: var(--tra-black);
  font-weight: 700;
}
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
.seg:focus-visible,
.tra-chip:focus-visible {
  outline: 2px solid var(--tra-yellow-dark);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>

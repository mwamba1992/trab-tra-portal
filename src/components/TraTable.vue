<script setup lang="ts">
import { onMounted, ref } from 'vue';
import DataTable, { type DataTablePageEvent, type DataTableRowClickEvent } from 'primevue/datatable';
import { useToast } from 'primevue/usetoast';
import { apiErrorMessage } from '@/utils/errors';
import { isInteractiveTarget } from '@/components/lists/replyStatus';

// Single shared table for the TRA portal. Owns lazy server-side pagination,
// loading and error state. Columns are passed as <Column> children via the default slot.
// Filtering is always server-side: the fetch function reads the caller's filters.
const props = withDefaults(
  defineProps<{
    // Fetches one page from the server. Returns the page items + grand total.
    fetch: (page: number, size: number) => Promise<{ items: object[]; total: number }>;
    dataKey?: string;
    rows?: number;
    rowsPerPageOptions?: number[];
    // Rows emit `row-click` (mouse convenience; each row should also contain a link as the keyboard target).
    clickable?: boolean;
    errorTitle?: string;
  }>(),
  {
    dataKey: 'id',
    rows: 10,
    rowsPerPageOptions: () => [10, 25, 50],
    clickable: false,
    errorTitle: 'Could not load records',
  },
);

const emit = defineEmits<{
  (e: 'row-click', row: object): void;
  (e: 'loaded', data: { items: object[]; total: number }): void;
}>();

const toast = useToast();
const items = ref<object[]>([]);
const total = ref(0);
const page = ref(1);
const size = ref(props.rows);
const loading = ref(false);
const error = ref('');
let requestSeq = 0;

const load = async () => {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    const res = await props.fetch(page.value, size.value);
    if (seq !== requestSeq) return; // a newer request superseded this one
    items.value = res.items;
    total.value = res.total;
    emit('loaded', res);
  } catch (e) {
    if (seq !== requestSeq) return;
    items.value = [];
    total.value = 0;
    error.value = apiErrorMessage(e);
    toast.add({ severity: 'error', summary: props.errorTitle, detail: error.value, life: 5000 });
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
};

const onPage = (e: DataTablePageEvent) => {
  page.value = e.page + 1;
  size.value = e.rows;
  load();
};

const onRowClick = (e: DataTableRowClickEvent) => {
  if (!props.clickable || isInteractiveTarget(e.originalEvent)) return;
  if (window.getSelection()?.toString()) return; // selecting text, not navigating
  emit('row-click', e.data as object);
};

// Reload from page 1 (after a filter/scope change or a mutation).
const reload = () => {
  page.value = 1;
  load();
};

defineExpose({ reload, load, items, total });
onMounted(load);
</script>

<template>
  <div class="tra-table" :class="{ 'tra-table-clickable': clickable }" :aria-busy="loading">
    <!-- PrimeVue's own `loading` mask is not used: it combines .p-overlay-mask (position: fixed + leave
         animation) with .p-datatable-mask and left a spinner floating mid-table (over the Assignee column). -->
    <DataTable
      :value="items"
      lazy
      paginator
      :rows="size"
      :first="(page - 1) * size"
      :totalRecords="total"
      :rowsPerPageOptions="rowsPerPageOptions"
      :dataKey="dataKey"
      stripedRows
      @page="onPage"
      @row-click="onRowClick"
    >
      <slot :page="page" :size="size" />
      <template #empty>
        <div v-if="error" class="tra-empty" role="alert">
          <i class="pi pi-exclamation-circle"></i>
          <div>{{ error }}</div>
          <button type="button" class="tra-btn tra-btn-ghost mt-3" @click="load"><i class="pi pi-refresh"></i> Retry</button>
        </div>
        <div v-else-if="loading" class="tra-empty"><i class="pi pi-spin pi-spinner"></i>Loading…</div>
        <slot v-else name="empty"
          ><div class="tra-empty"><i class="pi pi-inbox"></i>No records found.</div></slot
        >
      </template>
    </DataTable>
    <div v-if="loading && items.length" class="tra-table-busy" aria-hidden="true">
      <i class="pi pi-spin pi-spinner"></i>
    </div>
    <span class="sr-only" aria-live="polite">{{ loading ? 'Loading' : '' }}</span>
  </div>
</template>

<style scoped>
.tra-table {
  position: relative;
}
.tra-table-clickable :deep(.p-datatable-tbody > tr:not(.p-datatable-empty-message)) {
  cursor: pointer;
}
.tra-table-busy {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 72px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--tra-ink);
}
.tra-table-busy i {
  font-size: 22px;
}
</style>

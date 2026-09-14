<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import DataTable from 'primevue/datatable';

// Single shared table for the TRA portal. Owns lazy server-side pagination,
// loading state and (optional) client-side filtering of the current page.
// Columns are passed as <Column> children via the default slot.
const props = withDefaults(
  defineProps<{
    // Fetches one page from the server. Returns the page items + grand total.
    fetch: (page: number, size: number) => Promise<{ items: any[]; total: number }>;
    dataKey?: string;
    rows?: number;
    rowsPerPageOptions?: number[];
    clickable?: boolean;
    // Optional filter applied to the current page before display (e.g. quick search).
    filter?: (rows: any[]) => any[];
  }>(),
  {
    dataKey: 'id',
    rows: 10,
    rowsPerPageOptions: () => [10, 25, 50],
    clickable: false,
    filter: undefined,
  },
);

const emit = defineEmits<{
  (e: 'row-click', row: any): void;
  (e: 'loaded', data: { items: any[]; total: number }): void;
}>();

const items = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const size = ref(props.rows);
const loading = ref(false);

const displayed = computed(() => (props.filter ? props.filter(items.value) : items.value));

const load = async () => {
  loading.value = true;
  try {
    const res = await props.fetch(page.value, size.value);
    items.value = res.items;
    total.value = res.total;
    emit('loaded', res);
  } finally {
    loading.value = false;
  }
};

const onPage = (e: { page: number; rows: number }) => {
  page.value = e.page + 1;
  size.value = e.rows;
  load();
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
  <DataTable
    :value="displayed"
    :loading="loading"
    lazy
    paginator
    :rows="size"
    :totalRecords="total"
    :rowsPerPageOptions="rowsPerPageOptions"
    @page="onPage"
    :dataKey="dataKey"
    stripedRows
    :class="clickable ? 'cursor-pointer' : ''"
    @row-click="(e: any) => clickable && emit('row-click', e.data)"
  >
    <slot :page="page" :size="size" />
    <template #empty>
      <slot name="empty"><div class="tra-empty"><i class="pi pi-inbox"></i>No records found.</div></slot>
    </template>
  </DataTable>
</template>

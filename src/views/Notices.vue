<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Column from 'primevue/column';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import { TraApi, type NoticeItem } from '@/service/tra';
import { formatDate } from '@/utils/format';

const router = useRouter();
const search = ref('');
const table = ref<InstanceType<typeof TraTable> | null>(null);

const fetchPage = (page: number, size: number) => TraApi.notices(page, size, search.value);
const runSearch = () => table.value?.reload();
const clearSearch = () => {
  search.value = '';
  table.value?.reload();
};

const openRow = (row: object) => {
  const notice = row as NoticeItem;
  if (notice.appealId) router.push(`/appeals/${notice.appealId}`);
};

const payment = (n: NoticeItem) =>
  n.isExempted
    ? { cls: 'grey', text: 'Exempted' }
    : n.paymentStatus === 'PAID'
      ? { cls: 'green', text: 'Paid' }
      : { cls: 'amber', text: 'Unpaid' };
</script>

<template>
  <div>
    <PageHeader title="Notices of Appeal" :crumbs="['Tax Appeals', 'Notices']" />
    <p class="text-sm text-tra-muted -mt-2 mb-4">
      Notices of intention to appeal lodged against the Commissioner General. A notice links to its appeal once the statement of appeal is
      lodged.
    </p>

    <div class="tra-card tra-card-pad">
      <form class="search-bar" role="search" @submit.prevent="runSearch">
        <label for="notice-search" class="sr-only">Search notices</label>
        <input id="notice-search" v-model="search" type="search" class="search-input" placeholder="Search notice no. or appellant" />
        <button type="submit" class="tra-btn tra-btn-dark"><i class="pi pi-search" aria-hidden="true"></i> Search</button>
        <button v-if="search" type="button" class="tra-btn tra-btn-ghost" @click="clearSearch">Clear</button>
      </form>

      <TraTable ref="table" :fetch="fetchPage" clickable errorTitle="Could not load notices" @row-click="openRow">
        <Column header="Notice No.">
          <template #body="{ data }"
            ><strong class="text-tra-black">{{ data.noticeNo || 'No number yet' }}</strong></template
          >
        </Column>
        <Column header="Appellant">
          <template #body="{ data }">
            <div>{{ data.appellantName }}</div>
            <div v-if="data.region" class="text-xs text-tra-muted">{{ data.region }}</div>
          </template>
        </Column>
        <Column header="Lodged"
          ><template #body="{ data }">{{ formatDate(data.loggedAt) }}</template></Column
        >
        <Column header="Decision Served"
          ><template #body="{ data }">{{ formatDate(data.dateOfServiceDecision) }}</template></Column
        >
        <Column header="Fee">
          <template #body="{ data }"
            ><span class="tra-badge" :class="payment(data).cls">{{ payment(data).text }}</span></template
          >
        </Column>
        <Column header="Statement of Appeal">
          <template #body="{ data }">
            <router-link v-if="data.appealId" :to="`/appeals/${data.appealId}`" class="row-link">{{
              data.appealNo || 'Open appeal'
            }}</router-link>
            <span v-else class="tra-badge grey">Not yet lodged</span>
          </template>
        </Column>
        <template #empty
          ><div class="tra-empty"><i class="pi pi-file"></i>No notices found.</div></template
        >
      </TraTable>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.search-input {
  flex: 1 1 260px;
  min-width: 0;
  padding: 9px 12px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.search-input:focus {
  border-color: var(--tra-yellow);
  box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.2);
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
.row-link:focus-visible {
  outline: 2px solid var(--tra-yellow-dark);
  outline-offset: 2px;
  border-radius: 3px;
}
</style>

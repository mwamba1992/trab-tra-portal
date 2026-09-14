<script setup lang="ts">
import { useRouter } from 'vue-router';
import Column from 'primevue/column';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import { TraApi, type SummonsItem } from '@/service/tra';
import { formatDate, humanize } from '@/utils/format';

const router = useRouter();

const statusClass = (s: string | undefined) => (s === 'SERVED' ? 'green' : s === 'CONCLUDED' ? 'grey' : 'amber');
const openAppeal = (row: object) => router.push(`/appeals/${(row as SummonsItem).appealId}`);
</script>

<template>
  <div>
    <PageHeader title="Summons" :crumbs="['Tax Appeals', 'Summons']" />
    <p class="text-sm text-tra-muted -mt-2 mb-4">Hearing summons served on TRA for appeals it is defending.</p>

    <div class="tra-card tra-card-pad">
      <TraTable :fetch="TraApi.summons" dataKey="summonsAppealId" clickable errorTitle="Could not load summons" @row-click="openAppeal">
        <Column header="Appeal No.">
          <template #body="{ data }">
            <router-link :to="`/appeals/${data.appealId}`" class="row-link">{{ data.appealNo || 'No number yet' }}</router-link>
          </template>
        </Column>
        <Column header="Appellant"
          ><template #body="{ data }">{{ data.appellantName || '-' }}</template></Column
        >
        <Column header="Hearing Date">
          <template #body="{ data }"
            >{{ formatDate(data.summons?.startDate)
            }}<span v-if="data.summons?.time" class="text-tra-muted"> · {{ data.summons.time }}</span></template
          >
        </Column>
        <Column header="Venue"
          ><template #body="{ data }">{{ data.summons?.venue || '-' }}</template></Column
        >
        <Column header="Panel"
          ><template #body="{ data }">{{ data.summons?.judge?.name || '-' }}</template></Column
        >
        <Column header="Status">
          <template #body="{ data }"
            ><span class="tra-badge" :class="statusClass(data.summons?.status)">{{ humanize(data.summons?.status) }}</span></template
          >
        </Column>
        <template #empty
          ><div class="tra-empty"><i class="pi pi-calendar"></i>No summons served on TRA.</div></template
        >
      </TraTable>
    </div>
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
</style>

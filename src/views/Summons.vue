<script setup lang="ts">
import Column from 'primevue/column';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import { TraApi } from '@/service/tra';

const statusClass = (s: string) => (s === 'SERVED' ? 'green' : s === 'CONCLUDED' ? 'grey' : 'amber');
</script>

<template>
  <div>
    <PageHeader title="Summons" :crumbs="['Tax Appeals', 'Summons']" />
    <p class="text-sm text-tra-muted -mt-2 mb-4">Hearing summons served on TRA for appeals it is defending.</p>

    <div class="tra-card tra-card-pad">
      <TraTable :fetch="TraApi.summons" dataKey="summonsAppealId">
        <Column header="Appeal No."><template #body="{ data }"><span class="font-bold text-tra-ink">{{ data.appealNo || '—' }}</span></template></Column>
        <Column field="appellantName" header="Appellant" />
        <Column header="Hearing Date"><template #body="{ data }">{{ data.summons?.startDate }}<span v-if="data.summons?.time" class="text-tra-muted"> · {{ data.summons.time }}</span></template></Column>
        <Column header="Venue"><template #body="{ data }">{{ data.summons?.venue || '—' }}</template></Column>
        <Column header="Panel"><template #body="{ data }">{{ data.summons?.judge?.name || '—' }}</template></Column>
        <Column header="Status"><template #body="{ data }"><span class="tra-badge" :class="statusClass(data.summons?.status)">{{ data.summons?.status || '—' }}</span></template></Column>
        <template #empty><div class="tra-empty"><i class="pi pi-calendar"></i>No summons served on TRA.</div></template>
      </TraTable>
    </div>
  </div>
</template>

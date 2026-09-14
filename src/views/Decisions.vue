<script setup lang="ts">
import Column from 'primevue/column';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import { TraApi } from '@/service/tra';

const wonClass = (w: string) => (/tra|commissioner|respondent/i.test(w || '') ? 'green' : 'red');
</script>

<template>
  <div>
    <PageHeader title="Decisions" :crumbs="['Tax Appeals', 'Decisions']" />
    <p class="text-sm text-tra-muted -mt-2 mb-4">Board decisions delivered to TRA. Review outcomes and consider onward appeal to the Tribunal.</p>

    <div class="tra-card tra-card-pad">
      <TraTable :fetch="TraApi.decisions" dataKey="id">
        <Column header="Appeal No."><template #body="{ data }"><span class="font-bold text-tra-ink">{{ data.appealNo || '—' }}</span></template></Column>
        <Column field="appellantName" header="Appellant" />
        <Column header="Tax Type"><template #body="{ data }">{{ data.taxType?.name || '—' }}</template></Column>
        <Column header="Decided"><template #body="{ data }">{{ data.decidedDate || '—' }}</template></Column>
        <Column header="Outcome"><template #body="{ data }"><span class="tra-badge grey">{{ data.outcomeOfDecision }}</span></template></Column>
        <Column header="Won By"><template #body="{ data }"><span v-if="data.wonBy" class="tra-badge" :class="wonClass(data.wonBy)">{{ data.wonBy }}</span><span v-else>—</span></template></Column>
        <template #empty><div class="tra-empty"><i class="pi pi-verified"></i>No decisions delivered yet.</div></template>
      </TraTable>
    </div>
  </div>
</template>

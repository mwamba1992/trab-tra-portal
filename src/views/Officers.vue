<script setup lang="ts">
import { ref } from 'vue';
import Column from 'primevue/column';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import OfficerDialog from '@/components/officers/OfficerDialog.vue';
import ReplyDeadlineCard from '@/components/officers/ReplyDeadlineCard.vue';
import { fullName, isAdminOfficer, roleLabel } from '@/components/officers/officerForm';
import { OfficerApi, type OfficerRecord, type OfficerStatus } from '@/service/tra';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage } from '@/utils/errors';
import { formatDate, humanize } from '@/utils/format';

const auth = useAuthStore();
const toast = useToast();
const confirm = useConfirm();

const canSettings = auth.can('TRA Manage Settings');
const table = ref<InstanceType<typeof TraTable> | null>(null);
const total = ref<number | null>(null);
const reload = () => table.value?.reload();

const fetchOfficers = (page: number, size: number) => OfficerApi.list(page, size);
const onLoaded = (res: { total: number }) => {
  total.value = res.total;
};

/** DataTable slot rows are untyped; every row comes from OfficerApi.list. */
const row = (data: unknown) => data as OfficerRecord;

// ─── Create / edit ───
const dialogOpen = ref(false);
const editing = ref<OfficerRecord | null>(null);

const openNew = () => {
  editing.value = null;
  dialogOpen.value = true;
};
const openEdit = (o: OfficerRecord) => {
  editing.value = o;
  dialogOpen.value = true;
};

// ─── Activate / deactivate (PATCH status) ───
const busyId = ref<string | null>(null);
const isSelf = (o: OfficerRecord) => o.id === auth.user?.id;
const isActive = (o: OfficerRecord) => o.status === 'active';

const statusClass: Record<OfficerStatus, string> = { active: 'green', inactive: 'red', suspended: 'amber' };

const setStatus = async (o: OfficerRecord, status: OfficerStatus) => {
  busyId.value = o.id;
  try {
    await OfficerApi.update(o.id, { status });
    toast.add({
      severity: 'success',
      summary: status === 'active' ? 'Officer activated' : 'Officer deactivated',
      detail: fullName(o),
      life: 3000,
    });
    reload();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Status change failed', detail: apiErrorMessage(e), life: 5000 });
  } finally {
    busyId.value = null;
  }
};

const toggleStatus = (o: OfficerRecord) => {
  const deactivating = isActive(o);
  confirm.require({
    header: deactivating ? 'Deactivate officer?' : 'Activate officer?',
    message: deactivating
      ? `${fullName(o)} will no longer be able to sign in. Their assigned cases stay as they are.`
      : `${fullName(o)} will be able to sign in again.`,
    icon: deactivating ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: deactivating ? 'Deactivate' : 'Activate', severity: deactivating ? 'danger' : 'primary' },
    accept: () => setStatus(o, deactivating ? 'inactive' : 'active'),
  });
};
</script>

<template>
  <div>
    <PageHeader title="TRA Officers" :crumbs="['Administration', 'Officers']">
      <template #actions>
        <button type="button" class="tra-btn tra-btn-dark" @click="openNew">
          <i class="pi pi-plus" aria-hidden="true"></i> Add officer
        </button>
      </template>
    </PageHeader>
    <p class="officers-intro">
      Provision and manage TRA officers who defend appeals on the Authority's behalf.
      <span v-if="total !== null" class="officers-count">{{ total }} {{ total === 1 ? 'officer' : 'officers' }}</span>
    </p>

    <ReplyDeadlineCard v-if="canSettings" />

    <div class="tra-card tra-card-pad">
      <TraTable ref="table" :fetch="fetchOfficers" dataKey="id" errorTitle="Could not load officers" @loaded="onLoaded">
        <Column header="Name">
          <template #body="{ data }">
            <div class="officer-name">{{ fullName(row(data)) }}</div>
            <div class="officer-email">{{ row(data).email }}</div>
          </template>
        </Column>
        <Column header="Phone">
          <template #body="{ data }">{{ row(data).phone || '-' }}</template>
        </Column>
        <Column header="Role">
          <template #body="{ data }">
            <span class="tra-badge" :class="isAdminOfficer(row(data)) ? 'gold' : 'grey'">{{ roleLabel(row(data)) }}</span>
          </template>
        </Column>
        <Column header="Caseload">
          <template #body="{ data }">
            <span class="tra-badge" :class="row(data).caseload ? 'gold' : 'grey'">{{ row(data).caseload ?? 0 }}</span>
          </template>
        </Column>
        <Column header="Status">
          <template #body="{ data }">
            <span class="tra-badge" :class="statusClass[row(data).status] ?? 'grey'">{{ humanize(row(data).status) }}</span>
          </template>
        </Column>
        <Column header="Added">
          <template #body="{ data }">{{ formatDate(row(data).createdAt) }}</template>
        </Column>
        <Column header="Actions" :pt="{ headerCell: { class: 'officer-actions-col' } }">
          <template #body="{ data }">
            <div class="officer-actions">
              <button
                v-tooltip.top="'Edit'"
                type="button"
                class="tra-iconbtn"
                :aria-label="`Edit ${fullName(row(data))}`"
                @click="openEdit(row(data))"
              >
                <i class="pi pi-pencil" aria-hidden="true"></i>
              </button>
              <button
                v-if="!isSelf(row(data))"
                v-tooltip.top="isActive(row(data)) ? 'Deactivate' : 'Activate'"
                type="button"
                class="tra-iconbtn"
                :class="isActive(row(data)) ? 'officer-danger' : 'officer-success'"
                :aria-label="`${isActive(row(data)) ? 'Deactivate' : 'Activate'} ${fullName(row(data))}`"
                :disabled="busyId === row(data).id"
                @click="toggleStatus(row(data))"
              >
                <i
                  class="pi"
                  :class="busyId === row(data).id ? 'pi-spin pi-spinner' : isActive(row(data)) ? 'pi-ban' : 'pi-check-circle'"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="state-empty">
            <i class="pi pi-users" aria-hidden="true"></i>
            <div>No officers yet.</div>
            <button type="button" class="tra-btn tra-btn-gold officers-empty-cta" @click="openNew">
              <i class="pi pi-plus" aria-hidden="true"></i> Add the first officer
            </button>
          </div>
        </template>
      </TraTable>
    </div>

    <OfficerDialog v-model:visible="dialogOpen" :officer="editing" :current-user-id="auth.user?.id" @saved="reload" />
  </div>
</template>

<style scoped>
.officers-intro {
  margin: -8px 0 16px;
  font-size: 13px;
  color: var(--tra-muted);
}
.officers-count {
  margin-left: 6px;
  font-weight: 700;
  color: var(--tra-ink);
}
.officer-name {
  font-weight: 700;
  color: var(--tra-black);
}
.officer-email {
  font-size: 12px;
  color: var(--tra-muted);
  overflow-wrap: anywhere;
}
.officer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}
:deep(.officer-actions-col) {
  width: 6rem;
}
.officer-danger {
  color: var(--tra-danger);
}
.officer-success {
  color: var(--tra-success);
}
.officers-empty-cta {
  margin-top: 12px;
}
</style>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/layout/PageHeader.vue';
import TraTable from '@/components/TraTable.vue';
import { TraApi } from '@/service/tra';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const toast = useToast();
const table = ref<InstanceType<typeof TraTable> | null>(null);
const reload = () => table.value?.reload();

// Reply-deadline setting (supervisor only)
const canSettings = auth.can('TRA Manage Settings');
const deadlineDays = ref<number>(45);
const savingDeadline = ref(false);

const loadDeadline = async () => {
  try { deadlineDays.value = (await TraApi.getReplyDeadlineDays()).days; } catch { /* ignore */ }
};

const saveDeadline = async () => {
  savingDeadline.value = true;
  try {
    deadlineDays.value = (await TraApi.setReplyDeadlineDays(Number(deadlineDays.value))).days;
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Reply deadline updated', life: 3000 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Save failed', life: 3500 });
  } finally { savingDeadline.value = false; }
};
const dialog = ref(false);
const submitted = ref(false);
const saving = ref(false);
const form = ref<{ firstName: string; lastName: string; email: string; phone: string; password: string; isAdmin: boolean }>(empty());

function empty() { return { firstName: '', lastName: '', email: '', phone: '', password: '', isAdmin: false }; }

const openNew = () => { form.value = empty(); submitted.value = false; dialog.value = true; };

const save = async () => {
  submitted.value = true;
  const f = form.value;
  if (!f.firstName || !f.lastName || !f.email || !f.password) return;
  saving.value = true;
  try {
    await TraApi.createOfficer({ ...f });
    toast.add({ severity: 'success', summary: 'Created', detail: 'TRA officer created', life: 3000 });
    dialog.value = false;
    reload();
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Save failed', life: 3500 });
  } finally { saving.value = false; }
};

const deactivate = async (o: any) => {
  if (!confirm(`Deactivate ${o.firstName} ${o.lastName}?`)) return;
  try {
    await TraApi.deactivateOfficer(o.id);
    toast.add({ severity: 'success', summary: 'Deactivated', detail: 'Officer deactivated', life: 3000 });
    reload();
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Failed', life: 3500 });
  }
};

const roleLabel = (o: any) => (o.role?.name === 'tra-admin' || o.roleId ? (o.role?.name === 'tra-admin' ? 'Admin' : 'Officer') : 'Officer');
onMounted(() => { if (canSettings) loadDeadline(); });
</script>

<template>
  <div>
    <PageHeader title="TRA Officers" :crumbs="['Administration', 'Officers']">
      <template #actions>
        <button class="tra-btn tra-btn-dark" @click="openNew"><i class="pi pi-plus"></i> Add Officer</button>
      </template>
    </PageHeader>
    <p class="text-sm text-tra-muted -mt-2 mb-4">Provision and manage TRA officers who defend appeals on the Authority's behalf.</p>

    <!-- Reply-deadline setting -->
    <div v-if="canSettings" class="tra-card tra-card-pad mb-4">
      <div class="flex items-center gap-4 flex-wrap">
        <div>
          <div class="font-bold text-sm text-tra-black">Reply Deadline</div>
          <div class="text-xs text-tra-muted">Days TRA has to file a reply, counted from the appeal filing date.</div>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <input class="fld" type="number" min="1" v-model.number="deadlineDays" style="width:90px" />
          <span class="text-sm text-tra-muted">days</span>
          <button class="tra-btn tra-btn-dark" :disabled="savingDeadline || !deadlineDays" @click="saveDeadline">
            <i class="pi" :class="savingDeadline ? 'pi-spin pi-spinner' : 'pi-check'"></i> Save
          </button>
        </div>
      </div>
    </div>

    <div class="tra-card tra-card-pad">
      <TraTable ref="table" :fetch="TraApi.officers" dataKey="id">
        <Column field="firstName" header="First Name" />
        <Column field="lastName" header="Last Name" />
        <Column field="email" header="Email" />
        <Column field="phone" header="Phone"><template #body="{ data }">{{ data.phone || '—' }}</template></Column>
        <Column header="Role"><template #body="{ data }"><span class="tra-badge" :class="roleLabel(data)==='Admin' ? 'gold' : 'grey'">{{ roleLabel(data) }}</span></template></Column>
        <Column header="Caseload"><template #body="{ data }"><span class="tra-badge" :class="data.caseload ? 'gold' : 'grey'">{{ data.caseload ?? 0 }}</span></template></Column>
        <Column header="Status"><template #body="{ data }"><span class="tra-badge" :class="data.status==='active' ? 'green' : 'red'">{{ data.status }}</span></template></Column>
        <Column header="" style="width:4rem">
          <template #body="{ data }">
            <button v-if="data.status==='active'" class="tra-iconbtn" @click="deactivate(data)" v-tooltip.top="'Deactivate'"><i class="pi pi-ban text-tra-danger"></i></button>
          </template>
        </Column>
        <template #empty><div class="tra-empty"><i class="pi pi-users"></i>No officers yet.</div></template>
      </TraTable>
    </div>

    <Dialog v-model:visible="dialog" header="New TRA Officer" modal :style="{ width: '480px' }">
      <div class="flex flex-col gap-4 mt-1">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="lbl">First Name *</label><input class="fld" v-model="form.firstName" :class="{ err: submitted && !form.firstName }" /></div>
          <div><label class="lbl">Last Name *</label><input class="fld" v-model="form.lastName" :class="{ err: submitted && !form.lastName }" /></div>
        </div>
        <div><label class="lbl">Email *</label><input class="fld" type="email" v-model="form.email" :class="{ err: submitted && !form.email }" /></div>
        <div><label class="lbl">Phone</label><input class="fld" v-model="form.phone" /></div>
        <div><label class="lbl">Password *</label><input class="fld" type="password" v-model="form.password" :class="{ err: submitted && !form.password }" /></div>
        <label class="flex items-center gap-2 text-sm font-semibold text-tra-ink cursor-pointer">
          <input type="checkbox" v-model="form.isAdmin" /> Grant TRA admin rights (can manage officers)
        </label>
      </div>
      <template #footer>
        <button class="tra-btn tra-btn-ghost" @click="dialog=false">Cancel</button>
        <button class="tra-btn tra-btn-dark" :disabled="saving" @click="save"><i class="pi" :class="saving ? 'pi-spin pi-spinner' : 'pi-check'"></i> Save</button>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.lbl { display: block; font-size: 12px; font-weight: 700; color: var(--tra-ink); margin-bottom: 5px; }
.fld { width: 100%; height: 38px; padding: 0 12px; border: 1px solid var(--tra-border-strong); border-radius: 7px; font-size: 13px; outline: none; }
.fld:focus { border-color: var(--tra-yellow); box-shadow: 0 0 0 3px rgba(245,196,0,0.2); }
.fld.err { border-color: var(--tra-danger); }
</style>

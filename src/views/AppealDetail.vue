<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/layout/PageHeader.vue';
import { TraApi, type Appeal, type Reply, type CaseDoc, type CaseNote, type Officer, type CaseAssignment } from '@/service/tra';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const id = route.params.id as string;

const appeal = ref<Appeal | null>(null);
const parties = ref<{ appellants: any[]; respondents: any[] }>({ appellants: [], respondents: [] });
const replies = ref<Reply[]>([]);
const documents = ref<CaseDoc[]>([]);
const notes = ref<CaseNote[]>([]);
const officers = ref<Officer[]>([]);
const assignments = ref<CaseAssignment[]>([]);
const showHistory = ref(false);
const tab = ref<'overview' | 'reply' | 'documents' | 'notes'>('overview');
const loading = ref(true);

const replyBody = ref('');
const noteBody = ref('');
const selectedOfficer = ref('');
const filing = ref(false);
const uploading = ref(false);
const saving = ref(false);
const assigning = ref(false);

const canReply = computed(() => auth.can('TRA File Reply'));
const canDocs = computed(() => auth.can('TRA Manage Documents'));
const canNotes = computed(() => auth.can('TRA Manage Cases'));
const canAssign = computed(() => auth.can('TRA Assign Cases'));

const loadAll = async () => {
  loading.value = true;
  try {
    appeal.value = await TraApi.appeal(id);
    selectedOfficer.value = appeal.value.assignedOfficerId || '';
    parties.value = await TraApi.parties(id);
    replies.value = await TraApi.replies(id);
    documents.value = await TraApi.documents(id);
    if (canNotes.value) notes.value = await TraApi.notes(id);
    if (canAssign.value) {
      officers.value = (await TraApi.officers()).items.filter((o) => o.status === 'active');
      assignments.value = await TraApi.assignments(id);
    }
  } finally {
    loading.value = false;
  }
};

const reloadHistory = async () => {
  if (canAssign.value) assignments.value = await TraApi.assignments(id);
};

const submitReply = async () => {
  if (!replyBody.value.trim()) return;
  filing.value = true;
  try {
    await TraApi.fileReply(id, replyBody.value);
    replyBody.value = '';
    replies.value = await TraApi.replies(id);
    appeal.value = await TraApi.appeal(id);
    toast.add({ severity: 'success', summary: 'Filed', detail: 'Statement of defence filed', life: 3000 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Failed to file reply', life: 3500 });
  } finally {
    filing.value = false;
  }
};

const onFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  try {
    await TraApi.uploadDocument(id, file, 'EVIDENCE');
    documents.value = await TraApi.documents(id);
    toast.add({ severity: 'success', summary: 'Uploaded', detail: 'Evidence uploaded', life: 3000 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Upload failed', life: 3500 });
  } finally {
    uploading.value = false;
    (e.target as HTMLInputElement).value = '';
  }
};

const assign = async () => {
  if (!selectedOfficer.value) return;
  assigning.value = true;
  try {
    appeal.value = await TraApi.assign(id, selectedOfficer.value);
    await reloadHistory();
    toast.add({ severity: 'success', summary: 'Assigned', detail: 'Case assigned to officer', life: 3000 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Assign failed', life: 3500 });
  } finally {
    assigning.value = false;
  }
};

const unassign = async () => {
  assigning.value = true;
  try {
    appeal.value = await TraApi.unassign(id);
    selectedOfficer.value = '';
    await reloadHistory();
    toast.add({ severity: 'success', summary: 'Unassigned', detail: 'Case unassigned', life: 3000 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Failed', life: 3500 });
  } finally {
    assigning.value = false;
  }
};

const addNote = async () => {
  if (!noteBody.value.trim()) return;
  saving.value = true;
  try {
    await TraApi.addNote(id, noteBody.value);
    noteBody.value = '';
    notes.value = await TraApi.notes(id);
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Internal note added', life: 2500 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.message || 'Failed', life: 3500 });
  } finally {
    saving.value = false;
  }
};

// Reply-deadline banner state.
const deadline = computed(() => {
  const a = appeal.value;
  if (!a) return null;
  if (a.traReplied) return { cls: 'ok', icon: 'pi-check-circle', text: 'Statement of defence has been filed.' };
  if (a.overdue) return { cls: 'bad', icon: 'pi-exclamation-triangle', text: `Reply overdue — was due ${a.replyDueDate}.` };
  if (a.replyDueDate) {
    const d = a.daysRemaining ?? 0;
    return { cls: d <= 7 ? 'warn' : 'info', icon: 'pi-clock', text: `Reply due ${a.replyDueDate} — ${d} day${d === 1 ? '' : 's'} remaining.` };
  }
  return null;
});

onMounted(loadAll);
</script>

<template>
  <div>
    <PageHeader :title="appeal?.appealNo || 'Appeal'" :crumbs="['Tax Appeals', 'Appeals', appeal?.appealNo || '']">
      <template #actions>
        <button class="tra-btn tra-btn-ghost" @click="router.push('/appeals')"><i class="pi pi-arrow-left"></i> Back</button>
      </template>
    </PageHeader>

    <!-- Reply-deadline banner -->
    <div v-if="deadline" class="deadline" :class="deadline.cls">
      <i class="pi" :class="deadline.icon"></i><span>{{ deadline.text }}</span>
    </div>

    <div v-if="appeal" class="grid gap-4" style="grid-template-columns: 300px 1fr">
      <!-- Left summary -->
      <div class="tra-card tra-card-pad h-fit">
        <div class="text-xs font-bold text-tra-muted uppercase tracking-wide mb-3">Case Summary</div>
        <div class="summary-row"><span>Appeal No.</span><strong>{{ appeal.appealNo || '—' }}</strong></div>
        <div class="summary-row"><span>Appellant</span><strong>{{ appeal.appellantName }}</strong></div>
        <div class="summary-row"><span>Tax Type</span><strong>{{ appeal.taxType?.name || '—' }}</strong></div>
        <div class="summary-row"><span>Region</span><strong>{{ appeal.region?.name || '—' }}</strong></div>
        <div class="summary-row"><span>Filed</span><strong>{{ appeal.dateOfFiling }}</strong></div>
        <div class="summary-row"><span>Reply Due</span><strong>{{ appeal.replyDueDate || '—' }}</strong></div>
        <div class="summary-row"><span>Status</span><span class="tra-badge grey">{{ appeal.statusTrend }}</span></div>
        <div class="summary-row"><span>Decision</span><span class="tra-badge" :class="appeal.outcomeOfDecision === 'NO DECISION' ? 'amber' : 'green'">{{ appeal.outcomeOfDecision }}</span></div>

        <!-- Assignment -->
        <div class="mt-4 pt-4" style="border-top:1px solid var(--tra-border)">
          <div class="text-xs font-bold text-tra-muted uppercase tracking-wide mb-2">Handling Officer</div>
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-user-edit text-tra-yellow-dark text-xs"></i>
            <span v-if="appeal.assignedOfficerName" class="text-sm font-semibold text-tra-black">{{ appeal.assignedOfficerName }}</span>
            <span v-else class="tra-badge amber">Unassigned</span>
          </div>
          <div v-if="canAssign" class="flex flex-col gap-2">
            <select class="fld-sm" v-model="selectedOfficer">
              <option value="">Select officer…</option>
              <option v-for="o in officers" :key="o.id" :value="o.id">{{ o.firstName }} {{ o.lastName }}</option>
            </select>
            <div class="flex gap-2">
              <button class="tra-btn tra-btn-dark flex-1" :disabled="assigning || !selectedOfficer || selectedOfficer === appeal.assignedOfficerId" @click="assign">
                <i class="pi" :class="assigning ? 'pi-spin pi-spinner' : 'pi-check'"></i> Assign
              </button>
              <button v-if="appeal.assignedOfficerId" class="tra-btn tra-btn-ghost" :disabled="assigning" @click="unassign" v-tooltip.top="'Unassign'">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>

          <!-- Assignment history -->
          <div v-if="canAssign && assignments.length" class="mt-3">
            <button class="hist-toggle" @click="showHistory = !showHistory">
              <i class="pi" :class="showHistory ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
              Assignment history ({{ assignments.length }})
            </button>
            <div v-if="showHistory" class="mt-2">
              <div v-for="h in assignments" :key="h.id" class="hist-row">
                <span class="tra-badge" :class="h.action === 'UNASSIGNED' ? 'red' : 'gold'">{{ h.action }}</span>
                <div class="hist-body">
                  <span v-if="h.action === 'UNASSIGNED'">{{ h.previousOfficerName || '—' }} removed</span>
                  <span v-else-if="h.action === 'REASSIGNED'">{{ h.previousOfficerName || '—' }} → <strong>{{ h.officerName }}</strong></span>
                  <span v-else><strong>{{ h.officerName }}</strong></span>
                  <div class="hist-meta">{{ h.changedByName || 'System' }} · {{ new Date(h.createdAt).toLocaleString() }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-4" style="border-top:1px solid var(--tra-border)">
          <div class="text-xs font-bold text-tra-muted uppercase tracking-wide mb-2">Respondents</div>
          <div v-for="r in parties.respondents" :key="r.id" class="text-sm py-1 flex items-center gap-2">
            <i class="pi pi-building text-tra-yellow-dark text-xs"></i>{{ r.respondent?.name || r.respondentId }}
          </div>
        </div>
      </div>

      <!-- Right tabs -->
      <div class="tra-card">
        <div class="flex" style="border-bottom:1px solid var(--tra-border)">
          <button class="detail-tab" :class="{ active: tab==='overview' }" @click="tab='overview'"><i class="pi pi-info-circle"></i> Overview</button>
          <button class="detail-tab" :class="{ active: tab==='reply' }" @click="tab='reply'"><i class="pi pi-pencil"></i> Defence <span v-if="replies.length" class="tra-badge gold ml-1">{{ replies.length }}</span></button>
          <button class="detail-tab" :class="{ active: tab==='documents' }" @click="tab='documents'"><i class="pi pi-paperclip"></i> Documents <span v-if="documents.length" class="tra-badge grey ml-1">{{ documents.length }}</span></button>
          <button v-if="canNotes" class="detail-tab" :class="{ active: tab==='notes' }" @click="tab='notes'"><i class="pi pi-comment"></i> Notes <span v-if="notes.length" class="tra-badge grey ml-1">{{ notes.length }}</span></button>
        </div>

        <!-- Overview -->
        <div v-if="tab==='overview'" class="tra-card-pad">
          <div class="text-xs font-bold text-tra-muted uppercase tracking-wide mb-3">Appellants</div>
          <div v-for="p in parties.appellants" :key="p.id" class="party-chip">
            <i class="pi pi-user"></i>{{ p.appellant?.firstName || p.appellantName || '—' }} {{ p.appellant?.lastName || '' }}
          </div>
          <div v-if="!parties.appellants.length" class="text-sm text-tra-muted">No appellant records.</div>
        </div>

        <!-- Reply / defence -->
        <div v-if="tab==='reply'" class="tra-card-pad">
          <div v-if="canReply" class="mb-5">
            <label class="block text-xs font-bold text-tra-ink mb-2">FILE STATEMENT OF DEFENCE</label>
            <textarea v-model="replyBody" rows="5" class="fld-area" placeholder="State TRA's grounds of opposition to this appeal…"></textarea>
            <div class="flex justify-end mt-2">
              <button class="tra-btn tra-btn-dark" :disabled="filing || !replyBody.trim()" @click="submitReply">
                <i class="pi" :class="filing ? 'pi-spin pi-spinner' : 'pi-send'"></i> File Defence
              </button>
            </div>
          </div>
          <div class="text-xs font-bold text-tra-muted uppercase tracking-wide mb-2">Filed Replies</div>
          <div v-for="r in replies" :key="r.id" class="reply-card">
            <div class="flex items-center justify-between mb-1">
              <strong class="text-sm text-tra-black">{{ r.filedByName || 'TRA Officer' }}</strong>
              <span class="text-xs text-tra-muted">{{ new Date(r.createdAt).toLocaleString() }}</span>
            </div>
            <p class="text-sm text-tra-text whitespace-pre-wrap m-0">{{ r.body }}</p>
          </div>
          <div v-if="!replies.length" class="tra-empty"><i class="pi pi-pencil"></i>No defence filed yet.</div>
        </div>

        <!-- Documents -->
        <div v-if="tab==='documents'" class="tra-card-pad">
          <div v-if="canDocs" class="upload-zone mb-4">
            <input type="file" id="doc" class="hidden" @change="onFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            <label for="doc" class="flex items-center gap-3 cursor-pointer">
              <i class="pi pi-cloud-upload text-2xl text-tra-yellow-dark"></i>
              <div>
                <div class="font-bold text-sm text-tra-black">{{ uploading ? 'Uploading…' : 'Upload evidence' }}</div>
                <div class="text-xs text-tra-muted">PDF, image or Word — max 10MB</div>
              </div>
            </label>
          </div>
          <table class="w-full" style="border-collapse:collapse">
            <thead><tr style="background:#f4f5f6"><th class="th">Document</th><th class="th">Type</th><th class="th">Uploaded</th></tr></thead>
            <tbody>
              <tr v-for="d in documents" :key="d.id">
                <td class="td"><i class="pi pi-file-pdf text-tra-danger mr-2"></i>{{ d.originalName }}</td>
                <td class="td"><span class="tra-badge grey">{{ d.documentType }}</span></td>
                <td class="td text-tra-muted">{{ new Date(d.createdAt).toLocaleDateString() }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!documents.length" class="tra-empty"><i class="pi pi-paperclip"></i>No documents on this appeal.</div>
        </div>

        <!-- Internal notes -->
        <div v-if="tab==='notes' && canNotes" class="tra-card-pad">
          <div class="note-hint mb-4"><i class="pi pi-lock"></i> Internal to TRA — not shared with the Board or appellant.</div>
          <div class="mb-5">
            <textarea v-model="noteBody" rows="3" class="fld-area" placeholder="Add an internal case note…"></textarea>
            <div class="flex justify-end mt-2">
              <button class="tra-btn tra-btn-dark" :disabled="saving || !noteBody.trim()" @click="addNote">
                <i class="pi" :class="saving ? 'pi-spin pi-spinner' : 'pi-plus'"></i> Add Note
              </button>
            </div>
          </div>
          <div v-for="nt in notes" :key="nt.id" class="reply-card">
            <div class="flex items-center justify-between mb-1">
              <strong class="text-sm text-tra-black">{{ nt.authorName || 'TRA Officer' }}</strong>
              <span class="text-xs text-tra-muted">{{ new Date(nt.createdAt).toLocaleString() }}</span>
            </div>
            <p class="text-sm text-tra-text whitespace-pre-wrap m-0">{{ nt.body }}</p>
          </div>
          <div v-if="!notes.length" class="tra-empty"><i class="pi pi-comment"></i>No internal notes yet.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; font-size: 13px; border-bottom: 1px solid #f1f2f4; }
.summary-row span:first-child { color: var(--tra-muted); }
.detail-tab { display: inline-flex; align-items: center; gap: 7px; padding: 14px 18px; font-weight: 700; font-size: 13px; color: var(--tra-muted); border-bottom: 3px solid transparent; cursor: pointer; }
.detail-tab.active { color: var(--tra-black); border-bottom-color: var(--tra-yellow); }
.party-chip { display: inline-flex; align-items: center; gap: 8px; background: #f5f6f7; padding: 8px 12px; border-radius: 7px; font-size: 13px; font-weight: 600; margin: 0 8px 8px 0; }
.reply-card { border: 1px solid var(--tra-border); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; background: #fcfcfd; }
.fld-area { width: 100%; padding: 12px; border: 1px solid var(--tra-border-strong); border-radius: 8px; font-size: 13px; outline: none; resize: vertical; font-family: inherit; }
.fld-area:focus { border-color: var(--tra-yellow); box-shadow: 0 0 0 3px rgba(245,196,0,0.2); }
.fld-sm { width: 100%; height: 34px; padding: 0 10px; border: 1px solid var(--tra-border-strong); border-radius: 7px; font-size: 13px; outline: none; background: #fff; }
.fld-sm:focus { border-color: var(--tra-yellow); box-shadow: 0 0 0 3px rgba(245,196,0,0.2); }
.upload-zone { border: 2px dashed var(--tra-border-strong); border-radius: 10px; padding: 18px; background: #fcfbf3; }
.th { padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; text-align: left; color: var(--tra-ink); }
.td { padding: 11px 14px; font-size: 13px; border-top: 1px solid #eef0f2; }
.deadline { display: flex; align-items: center; gap: 9px; padding: 11px 16px; border-radius: 9px; font-size: 13px; font-weight: 600; margin-bottom: 16px; border: 1px solid; }
.deadline.ok { background: #ecfdf3; color: #027a48; border-color: #a6f4c5; }
.deadline.info { background: #eff8ff; color: #175cd3; border-color: #b2ddff; }
.deadline.warn { background: #fffaeb; color: #b54708; border-color: #fedf89; }
.deadline.bad { background: #fef3f2; color: #b42318; border-color: #fecdca; }
.note-hint { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--tra-muted); background: #f5f6f7; padding: 6px 12px; border-radius: 7px; }
.hist-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--tra-muted); cursor: pointer; }
.hist-toggle:hover { color: var(--tra-black); }
.hist-row { display: flex; align-items: flex-start; gap: 8px; padding: 7px 0; border-bottom: 1px solid #f1f2f4; }
.hist-body { font-size: 12px; color: var(--tra-ink); }
.hist-meta { font-size: 11px; color: var(--tra-muted); margin-top: 2px; }
</style>

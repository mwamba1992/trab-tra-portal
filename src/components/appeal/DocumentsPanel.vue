<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import {
  TraCaseApi,
  TRA_DOCUMENT_TYPES,
  MAX_UPLOAD_BYTES,
  ALLOWED_UPLOAD_EXTENSIONS,
  type CaseDocument,
  type TraDocumentType,
} from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';
import { formatDate, humanize } from '@/utils/format';
import SectionError from './SectionError.vue';
import { fileIcon, formatBytes, useStoredFile } from './appealUi';

const props = defineProps<{
  appealId: string;
  documents: CaseDocument[];
  canUpload: boolean;
  error: string;
  currentUserId: string | null;
}>();
const emit = defineEmits<{ uploaded: []; retry: [] }>();

const toast = useToast();
const { busy, openFile } = useStoredFile();

const docType = ref<TraDocumentType>('EVIDENCE');
const remarks = ref('');
const file = ref<File | null>(null);
const fileError = ref('');
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function validate(f: File | null): string {
  if (!f) return 'Choose a file to upload.';
  const dot = f.name.lastIndexOf('.');
  const ext = dot >= 0 ? f.name.slice(dot).toLowerCase() : '';
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext)) return `File type not allowed. Accepted: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}.`;
  if (f.size === 0) return 'The selected file is empty.';
  if (f.size > MAX_UPLOAD_BYTES) return `This file is ${formatBytes(f.size)}. The maximum size is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  return '';
}

const onPick = (e: Event) => {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null;
  fileError.value = file.value ? validate(file.value) : '';
};

const upload = async () => {
  fileError.value = validate(file.value);
  if (fileError.value || !file.value) return;
  uploading.value = true;
  try {
    await TraCaseApi.uploadDocument(props.appealId, file.value, docType.value, remarks.value);
    toast.add({ severity: 'success', summary: 'Uploaded', detail: `${humanize(docType.value)} document uploaded`, life: 3000 });
    file.value = null;
    remarks.value = '';
    docType.value = 'EVIDENCE';
    if (fileInput.value) fileInput.value.value = '';
    emit('uploaded');
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Upload failed',
      detail: apiErrorMessage(e, 'The document could not be uploaded.'),
      life: 4500,
    });
  } finally {
    uploading.value = false;
  }
};
</script>

<template>
  <div>
    <form v-if="canUpload" class="upload-zone mb-4" novalidate @submit.prevent="upload">
      <div class="upload-title"><i class="pi pi-cloud-upload text-tra-yellow-dark" aria-hidden="true"></i> Upload document</div>
      <div class="upload-grid">
        <div class="upload-field">
          <label for="doc-type">Document type</label>
          <select id="doc-type" v-model="docType" class="fld-sm" :disabled="uploading">
            <option v-for="t in TRA_DOCUMENT_TYPES" :key="t" :value="t">{{ humanize(t) }}</option>
          </select>
        </div>
        <div class="upload-field">
          <label for="doc-file">File <span class="req" aria-hidden="true">*</span></label>
          <input
            id="doc-file"
            ref="fileInput"
            type="file"
            class="fld-file"
            :accept="ALLOWED_UPLOAD_EXTENSIONS.join(',')"
            :disabled="uploading"
            :aria-invalid="!!fileError"
            aria-describedby="doc-file-help"
            required
            @change="onPick"
          />
          <div id="doc-file-help" class="help" :class="{ bad: fileError }" :role="fileError ? 'alert' : undefined">
            {{ fileError || 'PDF, JPG, PNG or Word — max 10 MB' }}
          </div>
        </div>
        <div class="upload-field span-2">
          <label for="doc-remarks">Remarks <span class="opt">(optional)</span></label>
          <textarea
            id="doc-remarks"
            v-model="remarks"
            rows="2"
            maxlength="500"
            class="fld-area"
            :disabled="uploading"
            placeholder="Short description of this document…"
          ></textarea>
        </div>
      </div>
      <div class="flex justify-end mt-3">
        <button type="submit" class="tra-btn tra-btn-dark" :disabled="uploading || !file">
          <i class="pi" :class="uploading ? 'pi-spin pi-spinner' : 'pi-upload'" aria-hidden="true"></i>
          {{ uploading ? 'Uploading…' : 'Upload' }}
        </button>
      </div>
    </form>

    <SectionError v-if="error" :message="error" @retry="emit('retry')" />
    <template v-else>
      <div v-if="documents.length" class="tra-scroll-x">
        <table class="doc-table">
          <caption class="sr-only">
            Documents on this appeal
          </caption>
          <thead>
            <tr>
              <th scope="col">Document</th>
              <th scope="col">Type</th>
              <th scope="col">Size</th>
              <th scope="col">Uploaded</th>
              <th scope="col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in documents" :key="d.id">
              <td>
                <div class="doc-name">
                  <i class="pi text-tra-danger" :class="fileIcon(d.originalName || d.fileName)" aria-hidden="true"></i>
                  <button type="button" class="tra-link name-btn" :disabled="!!busy" @click="openFile(d.fileName, 'view')">
                    {{ d.originalName || d.fileName }}
                  </button>
                </div>
                <div v-if="d.remarks" class="doc-remarks">{{ d.remarks }}</div>
              </td>
              <td>
                <span class="tra-badge grey">{{ humanize(d.documentType) }}</span>
              </td>
              <td class="muted">{{ formatBytes(d.fileSize) }}</td>
              <td class="muted">
                {{ formatDate(d.createdAt) }}
                <span v-if="currentUserId && d.uploadedBy === currentUserId" class="tra-badge gold ml-1">You</span>
              </td>
              <td class="actions">
                <button
                  v-tooltip.top="'View'"
                  type="button"
                  class="icon-btn"
                  :disabled="!!busy"
                  :aria-label="`View ${d.originalName || d.fileName} in a new tab`"
                  @click="openFile(d.fileName, 'view')"
                >
                  <i class="pi" :class="busy === `view:${d.fileName}` ? 'pi-spin pi-spinner' : 'pi-external-link'" aria-hidden="true"></i>
                </button>
                <button
                  v-tooltip.top="'Download'"
                  type="button"
                  class="icon-btn"
                  :disabled="!!busy"
                  :aria-label="`Download ${d.originalName || d.fileName}`"
                  @click="openFile(d.fileName, 'download', d.originalName)"
                >
                  <i class="pi" :class="busy === `download:${d.fileName}` ? 'pi-spin pi-spinner' : 'pi-download'" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="tra-empty"><i class="pi pi-paperclip" aria-hidden="true"></i>No documents on this appeal.</div>
    </template>
  </div>
</template>

<style scoped>
.upload-zone {
  border: 2px dashed var(--tra-border-strong);
  border-radius: 10px;
  padding: 16px 18px;
  background: #fcfbf3;
}
.upload-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
  color: var(--tra-black);
  margin-bottom: 12px;
}
.upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}
.span-2 {
  grid-column: 1 / -1;
}
@media (max-width: 640px) {
  .upload-grid {
    grid-template-columns: 1fr;
  }
}
/* Wrapper, not the shared .fld input style from styles.scss */
.upload-field label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--tra-ink);
  margin-bottom: 5px;
}
.req {
  color: var(--tra-danger);
}
.opt {
  font-weight: 500;
  color: var(--tra-muted);
}
.fld-sm {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 7px;
  font-size: 13px;
  outline: none;
  background: #fff;
}
.fld-file {
  width: 100%;
  font-size: 13px;
  padding: 6px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 7px;
  background: #fff;
}
.fld-file[aria-invalid='true'] {
  border-color: var(--tra-danger);
}
.fld-area {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--tra-border-strong);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  background: #fff;
}
.fld-sm:focus,
.fld-area:focus,
.fld-file:focus {
  border-color: var(--tra-yellow);
  box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.2);
}
.help {
  font-size: 11.5px;
  color: var(--tra-muted);
  margin-top: 4px;
}
.help.bad {
  color: var(--tra-danger);
  font-weight: 600;
}
.tra-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.doc-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 560px;
}
.doc-table thead tr {
  background: #f4f5f6;
}
.doc-table th {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  text-align: left;
  color: var(--tra-ink);
}
.doc-table td {
  padding: 11px 14px;
  font-size: 13px;
  border-top: 1px solid #eef0f2;
  vertical-align: top;
}
.doc-name {
  display: flex;
  align-items: center;
  gap: 8px;
}
.name-btn {
  background: none;
  border-top: 0;
  border-left: 0;
  border-right: 0;
  padding: 0;
  font-size: 13px;
  text-align: left;
  overflow-wrap: anywhere;
}
.name-btn:disabled {
  cursor: progress;
}
.doc-remarks {
  font-size: 12px;
  color: var(--tra-muted);
  margin: 4px 0 0 22px;
  white-space: pre-wrap;
}
.muted {
  color: var(--tra-muted);
  white-space: nowrap;
}
.actions {
  white-space: nowrap;
  text-align: right;
}
.icon-btn {
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  border-radius: 7px;
  border: 1px solid var(--tra-border-strong);
  background: #fff;
  color: var(--tra-ink);
  cursor: pointer;
  margin-left: 6px;
}
.icon-btn:hover {
  background: #f4f5f6;
}
.icon-btn:disabled {
  opacity: 0.55;
  cursor: progress;
}
</style>

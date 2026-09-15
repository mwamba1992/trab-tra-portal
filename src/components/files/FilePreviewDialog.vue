<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import { TraCaseApi } from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';
import { closePreview, mimeFor, previewKind, previewState } from './filePreview';

const url = ref('');
const loading = ref(false);
const error = ref('');
const frame = ref<HTMLIFrameElement | null>(null);
let requestSeq = 0;

const request = computed(() => previewState.request);
const kind = computed(() => (request.value ? previewKind(request.value.fileName) : 'other'));
const visible = computed({
  get: () => request.value !== null,
  set: (open: boolean) => {
    if (!open) closePreview();
  },
});

const release = () => {
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = '';
};

const load = async () => {
  const req = request.value;
  if (!req) return;
  const seq = ++requestSeq;
  release();
  error.value = '';
  loading.value = true;
  try {
    // The uploads route needs the officer's token, so the file is fetched rather than linked.
    const blob = await TraCaseApi.fileBlob(req.fileName);
    if (seq !== requestSeq) return;
    // Retyped from the file name: served generically, a PDF would download instead of displaying.
    url.value = URL.createObjectURL(new Blob([blob], { type: mimeFor(req.fileName) }));
  } catch (e) {
    if (seq === requestSeq) error.value = apiErrorMessage(e, 'The file could not be loaded. It may have been removed.');
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
};

watch(request, (req) => {
  if (req) {
    void load();
  } else {
    requestSeq++;
    release();
  }
});
onBeforeUnmount(release);

const download = () => {
  const req = request.value;
  if (!req || !url.value) return;
  const link = document.createElement('a');
  link.href = url.value;
  link.download = req.downloadName || req.fileName;
  link.click();
};

const print = () => frame.value?.contentWindow?.print();
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    maximizable
    :header="request?.title || 'Document'"
    :style="{ width: 'min(1100px, 96vw)' }"
    :content-style="{ padding: 0 }"
  >
    <div class="preview-body">
      <div v-if="loading" class="preview-state" aria-live="polite">
        <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
        <span>Loading document…</span>
      </div>
      <div v-else-if="error" class="preview-state" role="alert">
        <i class="pi pi-exclamation-circle preview-error-icon" aria-hidden="true"></i>
        <span>{{ error }}</span>
        <button type="button" class="tra-btn tra-btn-ghost" @click="load"><i class="pi pi-refresh" aria-hidden="true"></i> Retry</button>
      </div>
      <iframe
        v-else-if="url && kind === 'pdf'"
        ref="frame"
        :src="url"
        :title="request?.title || 'Document preview'"
        class="preview-frame"
      ></iframe>
      <div v-else-if="url && kind === 'image'" class="preview-image">
        <img :src="url" :alt="request?.title || 'Document'" />
      </div>
      <div v-else-if="url" class="preview-state">
        <i class="pi pi-file" aria-hidden="true"></i>
        <span>This file type can't be shown here. Download it to open it.</span>
      </div>
    </div>
    <template #footer>
      <button type="button" class="tra-btn tra-btn-ghost" @click="closePreview">Close</button>
      <button v-if="kind === 'pdf'" type="button" class="tra-btn tra-btn-ghost" :disabled="!url" @click="print">
        <i class="pi pi-print" aria-hidden="true"></i> Print
      </button>
      <button type="button" class="tra-btn tra-btn-dark" :disabled="!url" @click="download">
        <i class="pi pi-download" aria-hidden="true"></i> Download
      </button>
    </template>
  </Dialog>
</template>

<style scoped>
.preview-body {
  display: flex;
  /* Leaves room for the dialog header and footer so the document never runs under the buttons */
  height: min(calc(90vh - 160px), 860px);
  background: var(--tra-bg);
}
.preview-frame {
  display: block;
  flex: 1;
  width: 100%;
  height: 100%;
  border: 0;
}
.preview-image {
  flex: 1;
  display: grid;
  place-items: center;
  overflow: auto;
  padding: 16px;
}
.preview-image img {
  max-width: 100%;
  height: auto;
}
.preview-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
  color: var(--tra-muted);
}
.preview-error-icon {
  font-size: 22px;
  color: var(--tra-danger);
}
:global(.p-dialog-maximized) .preview-body {
  height: calc(100vh - 140px);
}
</style>

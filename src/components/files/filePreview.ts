import { reactive } from 'vue';

export interface PreviewRequest {
  /** Stored upload name, fetched through the authenticated uploads route. */
  fileName: string;
  title: string;
  /** Name used when the officer downloads the file from the preview. */
  downloadName?: string | null;
}

export type PreviewKind = 'pdf' | 'image' | 'other';

/** One preview window for the whole portal, mounted in the layout. */
export const previewState = reactive<{ request: PreviewRequest | null }>({ request: null });

export function openPreview(request: PreviewRequest): void {
  previewState.request = { ...request };
}

export function closePreview(): void {
  previewState.request = null;
}

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const extensionOf = (fileName: string) => (fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase() : '');

/** Content type from the file name; the download route labels every file generically. */
export function mimeFor(fileName: string): string {
  return MIME_TYPES[extensionOf(fileName)] ?? 'application/octet-stream';
}

export function previewKind(fileName: string): PreviewKind {
  const ext = extensionOf(fileName);
  if (ext === 'pdf') return 'pdf';
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'image';
  return 'other';
}

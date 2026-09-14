import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { TraCaseApi } from '@/service/tra';
import { apiErrorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';

/** "14 Sep 2026, 09:30" — formatDate plus a local time. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDate(value);
  return `${formatDate(d)}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatBytes(size: number | string | null | undefined): string {
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileIcon(name: string | null | undefined): string {
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pi-file-pdf';
  if (ext === 'doc' || ext === 'docx') return 'pi-file-word';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return 'pi-image';
  return 'pi-file';
}

/**
 * Opens or downloads a stored upload. The backend route is JWT-guarded, so the file is
 * fetched with the token and handed to the browser as a blob URL.
 */
export function useStoredFile() {
  const toast = useToast();
  const busy = ref<string | null>(null);

  const openFile = async (fileName: string, mode: 'view' | 'download', displayName?: string | null) => {
    busy.value = `${mode}:${fileName}`;
    try {
      const blob = await TraCaseApi.fileBlob(fileName);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      if (mode === 'download') {
        link.download = displayName || fileName;
      } else {
        link.target = '_blank';
        link.rel = 'noopener';
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: 'File unavailable',
        detail: apiErrorMessage(e, 'The file could not be retrieved. It may have been removed.'),
        life: 4000,
      });
    } finally {
      busy.value = null;
    }
  };

  return { busy, openFile };
}

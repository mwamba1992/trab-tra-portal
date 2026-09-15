import { describe, it, expect } from 'vitest';
import { closePreview, mimeFor, openPreview, previewKind, previewState } from './filePreview';

describe('file preview', () => {
  it('shows PDFs and images inline and offers everything else as a download', () => {
    expect(previewKind('judgement.PDF')).toBe('pdf');
    expect(previewKind('scan.jpeg')).toBe('image');
    expect(previewKind('reply.docx')).toBe('other');
    expect(previewKind('no-extension')).toBe('other');
  });

  it('retypes files by extension so the browser can render them', () => {
    expect(mimeFor('3f2a.pdf')).toBe('application/pdf');
    expect(mimeFor('photo.png')).toBe('image/png');
    expect(mimeFor('archive.zip')).toBe('application/octet-stream');
  });

  it('opens one preview at a time and closes it', () => {
    openPreview({ fileName: 'a.pdf', title: 'Judgement · DSM.1/2026' });
    openPreview({ fileName: 'b.pdf', title: 'Evidence' });
    expect(previewState.request).toEqual({ fileName: 'b.pdf', title: 'Evidence' });

    closePreview();
    expect(previewState.request).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { mountWithApp } from '@/test/mountPage';

vi.mock('@/service/tra', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/service/tra')>();
  return { ...actual, TraCaseApi: { ...actual.TraCaseApi, uploadDocument: vi.fn(), fileBlob: vi.fn() } };
});

import { TraCaseApi } from '@/service/tra';
import DocumentsPanel from './DocumentsPanel.vue';

const pick = async (wrapper: VueWrapper, file: File) => {
  const input = wrapper.find('#doc-file');
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
  await input.trigger('change');
};

const panel = (props: Record<string, unknown> = {}) =>
  mountWithApp(DocumentsPanel, {
    props: { appealId: 'a1', documents: [], canUpload: true, error: '', currentUserId: 'officer-1', ...props },
  });

describe('DocumentsPanel', () => {
  beforeEach(() =>
    vi
      .mocked(TraCaseApi.uploadDocument)
      .mockReset()
      .mockResolvedValue({} as never),
  );

  it('rejects files the backend would refuse before uploading', async () => {
    const { wrapper } = await panel();
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();

    await pick(wrapper, new File(['x'], 'payload.exe'));
    expect(wrapper.text()).toContain('File type not allowed');

    const big = new File(['x'], 'scan.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    await pick(wrapper, big);
    expect(wrapper.text()).toContain('The maximum size is 10.0 MB');

    await wrapper.find('form').trigger('submit');
    expect(TraCaseApi.uploadDocument).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('uploads with the chosen type and remarks', async () => {
    const { wrapper } = await panel();
    const file = new File(['%PDF'], 'defence-bundle.pdf', { type: 'application/pdf' });

    await pick(wrapper, file);
    await wrapper.find('#doc-type').setValue('SUPPORTING');
    await wrapper.find('#doc-remarks').setValue('Signed copy');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(TraCaseApi.uploadDocument).toHaveBeenCalledWith('a1', file, 'SUPPORTING', 'Signed copy');
    expect(wrapper.emitted('uploaded')).toHaveLength(1);
    wrapper.unmount();
  });

  it('lists documents and hides the upload form without permission', async () => {
    const { wrapper } = await panel({
      canUpload: false,
      documents: [
        {
          id: 'd1',
          fileName: 'uuid.pdf',
          originalName: 'Judgement.pdf',
          documentType: 'JUDGEMENT',
          remarks: 'Decision filed by Judge',
          uploadedBy: 'officer-1',
          createdAt: '2026-04-01T10:00:00Z',
          fileSize: 487000,
        },
      ],
    });

    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('Judgement.pdf');
    expect(wrapper.text()).toContain('Decision filed by Judge');
    expect(wrapper.text()).toContain('You');
    expect(wrapper.find('[aria-label="Download Judgement.pdf"]').exists()).toBe(true);
    wrapper.unmount();
  });
});

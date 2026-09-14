import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountWithApp, signIn } from '@/test/mountPage';
import type { AppealDetail as AppealDetailData } from '@/service/tra';

vi.mock('@/service/tra', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/service/tra')>();
  return {
    ...actual,
    TraCaseApi: { ...actual.TraCaseApi, appeal: vi.fn(), parties: vi.fn(), documents: vi.fn(), fileBlob: vi.fn() },
    TraApi: { ...actual.TraApi, replies: vi.fn(), notes: vi.fn(), officers: vi.fn(), assignments: vi.fn() },
  };
});

import { TraApi, TraCaseApi } from '@/service/tra';
import AppealDetail from './AppealDetail.vue';

const decidedAppeal = {
  id: 'a1',
  appealNo: 'DSM.1/2026',
  appellantName: 'VODACOM TANZANIA',
  dateOfFiling: '2026-04-01',
  statusTrend: 'DECIDED',
  outcomeOfDecision: 'Appeal dismissed',
  caseClosed: true,
  replyStatus: 'NOT_REQUIRED',
  decidedDate: '2026-04-01',
  wonBy: 'RESPONDENT',
  summaryOfDecree: 'The appeal is dismissed with costs.',
  judgementFile: 'judgement.pdf',
  amounts: [],
} as AppealDetailData;

const ALL = ['TRA File Reply', 'TRA Manage Documents', 'TRA Manage Cases', 'TRA Assign Cases'];

const tabButton = (wrapper: Awaited<ReturnType<typeof mountWithApp>>['wrapper'], label: string) =>
  wrapper.findAll('[role="tab"]').find((t) => t.text().includes(label));

describe('AppealDetail', () => {
  beforeEach(() => {
    vi.mocked(TraCaseApi.appeal).mockReset().mockResolvedValue(decidedAppeal);
    vi.mocked(TraCaseApi.parties).mockReset().mockResolvedValue({ appellants: [], respondents: [] });
    vi.mocked(TraCaseApi.documents).mockReset().mockResolvedValue([]);
    vi.mocked(TraApi.replies).mockReset().mockResolvedValue([]);
    vi.mocked(TraApi.notes).mockReset().mockResolvedValue([]);
    vi.mocked(TraApi.officers).mockReset().mockResolvedValue({ items: [], total: 0 });
    vi.mocked(TraApi.assignments).mockReset().mockResolvedValue([]);
  });

  it('shows the board decision and closed-case banner for a decided appeal', async () => {
    signIn(ALL);
    const { wrapper } = await mountWithApp(AppealDetail, { route: '/appeals/a1' });

    expect(TraCaseApi.appeal).toHaveBeenCalledWith('a1');
    expect(wrapper.text()).toContain('DSM.1/2026');
    expect(wrapper.text()).toContain('Case closed — a reply is no longer expected.');
    expect(wrapper.text()).toContain('The appeal is dismissed with costs.');
    expect(tabButton(wrapper, 'Documents')).toBeDefined();
    expect(tabButton(wrapper, 'Notes')).toBeDefined();
    wrapper.unmount();
  });

  it('hides sections the officer is not allowed to use and never requests them', async () => {
    signIn(['TRA File Reply'], { role: 'tra-officer' });
    const { wrapper } = await mountWithApp(AppealDetail, { route: '/appeals/a1' });

    expect(tabButton(wrapper, 'Documents')).toBeUndefined();
    expect(tabButton(wrapper, 'Notes')).toBeUndefined();
    expect(TraCaseApi.documents).not.toHaveBeenCalled();
    expect(TraApi.notes).not.toHaveBeenCalled();
    expect(TraApi.officers).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps the page usable when one section fails, and retries just that section', async () => {
    signIn(ALL);
    vi.mocked(TraApi.replies).mockRejectedValueOnce(new Error('Network Error'));
    const { wrapper } = await mountWithApp(AppealDetail, { route: '/appeals/a1' });

    await tabButton(wrapper, 'Defence')!.trigger('click');
    expect(wrapper.text()).toContain('Filed replies could not be loaded.');
    // A closed case takes no new defence, so the filing form stays hidden
    expect(wrapper.find('#reply-body').exists()).toBe(false);

    const retry = wrapper.findAll('button').find((b) => b.text().includes('Retry'));
    await retry!.trigger('click');
    await flushPromises();

    expect(TraApi.replies).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).not.toContain('Filed replies could not be loaded.');
    expect(wrapper.text()).toContain('No defence filed yet.');
    wrapper.unmount();
  });

  it('offers a retry when the appeal itself cannot be loaded', async () => {
    signIn(ALL);
    vi.mocked(TraCaseApi.appeal).mockRejectedValueOnce({ response: { status: 404, data: { message: 'Appeal not found' } } });
    const { wrapper } = await mountWithApp(AppealDetail, { route: '/appeals/a1' });

    expect(wrapper.text()).toContain('Unable to open this appeal');
    expect(wrapper.text()).toContain('Appeal not found');

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Retry'))!
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Unable to open this appeal');
    expect(wrapper.text()).toContain('The appeal is dismissed with costs.');
    wrapper.unmount();
  });
});

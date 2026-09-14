import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountWithApp, signIn } from '@/test/mountPage';
import { isoDate, todayIso } from '@/utils/format';
import type { Appeal } from '@/service/tra';

vi.mock('@/service/tra', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/service/tra')>();
  return { ...actual, TraApi: { ...actual.TraApi, appeals: vi.fn(), officers: vi.fn() } };
});
vi.mock('@/utils/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/format')>();
  return { ...actual, downloadCsv: vi.fn() };
});

import { TraApi } from '@/service/tra';
import { downloadCsv } from '@/utils/format';
import Appeals from './Appeals.vue';

const decided: Appeal = {
  id: 'a1',
  appealNo: 'DSM.1/2026',
  appellantName: 'VODACOM TANZANIA',
  dateOfFiling: '2026-04-01',
  statusTrend: 'DECIDED',
  outcomeOfDecision: 'Appeal dismissed',
  assignedOfficerName: 'Peter Auma',
  caseClosed: true,
  replyStatus: 'NOT_REQUIRED',
};

const lastQuery = () => {
  const calls = vi.mocked(TraApi.appeals).mock.calls;
  return calls[calls.length - 1]?.[0];
};

describe('Appeals list', () => {
  beforeEach(() => {
    signIn(['TRA Manage Users']);
    vi.mocked(TraApi.appeals)
      .mockReset()
      .mockResolvedValue({ items: [decided], total: 1 });
    vi.mocked(TraApi.officers).mockReset().mockResolvedValue({ items: [], total: 0 });
    vi.mocked(downloadCsv).mockReset();
  });

  it('applies filters from the address bar on the server', async () => {
    const { wrapper } = await mountWithApp(Appeals, { route: '/appeals?overdue=1&q=voda&status=DECIDED' });

    expect(lastQuery()).toMatchObject({ page: 1, overdue: true, search: 'voda', status: 'DECIDED', scope: 'all' });
    expect((wrapper.find('#f-search').element as HTMLInputElement).value).toBe('voda');
    const overdue = wrapper.findAll('button').find((b) => b.text().includes('Overdue only'));
    expect(overdue!.attributes('aria-pressed')).toBe('true');
    wrapper.unmount();
  });

  it('lists appeals with a link to each case and a readable reply status', async () => {
    const { wrapper } = await mountWithApp(Appeals, { route: '/appeals' });

    expect(wrapper.find('a[href="/appeals/a1"]').text()).toBe('DSM.1/2026');
    expect(wrapper.text()).toContain('Not required');
    expect(wrapper.text()).toContain('1 Apr 2026');
    wrapper.unmount();
  });

  it('turns a quick range into a filed-date filter and records it in the address', async () => {
    const { wrapper, router } = await mountWithApp(Appeals, { route: '/appeals' });

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '-1M')!
      .trigger('click');
    await flushPromises();

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    expect(lastQuery()).toMatchObject({ dateFrom: isoDate(monthAgo), dateTo: todayIso(), page: 1 });
    expect(router.currentRoute.value.query.range).toBe('1M');
    wrapper.unmount();
  });

  it('exports every matching appeal, not just the visible page', async () => {
    const page1 = Array.from({ length: 500 }, (_, i) => ({ ...decided, id: `a${i}`, appealNo: `DSM.${i}/2026` }));
    vi.mocked(TraApi.appeals).mockImplementation((q = {}) =>
      Promise.resolve(q.size === 500 ? { items: q.page === 1 ? page1 : [decided], total: 501 } : { items: [decided], total: 501 }),
    );
    const { wrapper } = await mountWithApp(Appeals, { route: '/appeals' });

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Export'))!
      .trigger('click');
    await flushPromises();

    const [, headers, rows] = vi.mocked(downloadCsv).mock.calls[0];
    expect(headers).toContain('Reply');
    expect(rows).toHaveLength(501);
    expect(rows[0]).toEqual(['DSM.0/2026', 'VODACOM TANZANIA', undefined, '1 Apr 2026', 'Peter Auma', '-', 'Not required', 'Decided']);
    wrapper.unmount();
  });
});

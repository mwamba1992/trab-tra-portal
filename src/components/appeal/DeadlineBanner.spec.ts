import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DeadlineBanner from './DeadlineBanner.vue';
import type { AppealDetail } from '@/service/tra';

const banner = (overrides: Partial<AppealDetail>) =>
  mount(DeadlineBanner, {
    props: {
      appeal: {
        id: 'a1',
        appealNo: 'DSM.1/2026',
        appellantName: 'ACME Ltd',
        dateOfFiling: '2026-08-01',
        statusTrend: 'NEW',
        outcomeOfDecision: 'NO DECISION',
        ...overrides,
      } as AppealDetail,
    },
  });

describe('DeadlineBanner', () => {
  it('confirms a filed defence', () => {
    const wrapper = banner({ replyStatus: 'REPLIED', repliedAt: '2026-09-01' });
    expect(wrapper.text()).toBe('Statement of defence has been filed on 1 Sep 2026.');
    expect(wrapper.classes()).toContain('ok');
  });

  it('tells officers a closed case needs no reply, even past the due date', () => {
    const wrapper = banner({ caseClosed: true, overdue: true, replyDueDate: '2026-08-15' });
    expect(wrapper.text()).toBe('Case closed — a reply is no longer expected.');
  });

  it('warns about overdue and nearly due replies', () => {
    expect(banner({ overdue: true, replyDueDate: '2026-08-15' }).text()).toBe('Reply overdue — was due 15 Aug 2026.');

    const soon = banner({ replyDueDate: '2026-09-15', daysRemaining: 1 });
    expect(soon.text()).toBe('Reply due 15 Sep 2026 — 1 day remaining.');
    expect(soon.classes()).toContain('warn');

    expect(banner({ replyDueDate: '2026-10-15', daysRemaining: 30 }).classes()).toContain('info');
  });

  it('shows nothing when there is no deadline yet', () => {
    expect(banner({}).html()).toBe('<!--v-if-->');
  });
});

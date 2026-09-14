import { describe, it, expect } from 'vitest';
import { isInteractiveTarget, replyBadge } from './replyStatus';
import type { Appeal } from '@/service/tra';

const appeal = (overrides: Partial<Appeal>): Appeal => ({
  id: 'a1',
  appealNo: 'DSM.1/2026',
  appellantName: 'ACME Ltd',
  dateOfFiling: '2026-08-01',
  statusTrend: 'NEW',
  outcomeOfDecision: 'NO DECISION',
  ...overrides,
});

describe('replyBadge', () => {
  it('shows when the defence was filed', () => {
    expect(replyBadge(appeal({ replyStatus: 'REPLIED', repliedAt: '2026-09-04' }))).toMatchObject({
      cls: 'green',
      text: 'Filed 4 Sep 2026',
    });
  });

  it('never flags a decided case as overdue', () => {
    expect(replyBadge(appeal({ statusTrend: 'DECIDED', overdue: true, replyDueDate: '2026-08-15' }))).toMatchObject({
      cls: 'grey',
      text: 'Not required',
    });
    expect(replyBadge(appeal({ outcomeOfDecision: 'Appeal dismissed', overdue: true }))).toMatchObject({ text: 'Not required' });
  });

  it('flags open overdue cases and counts down the rest', () => {
    expect(replyBadge(appeal({ overdue: true, replyDueDate: '2026-08-15' }))).toEqual({
      cls: 'red',
      text: 'Overdue',
      title: 'Due 15 Aug 2026',
    });
    expect(replyBadge(appeal({ daysRemaining: 5 }))).toMatchObject({ cls: 'amber', text: '5d left' });
    expect(replyBadge(appeal({ daysRemaining: 20 }))).toMatchObject({ cls: 'grey', text: '20d left' });
    expect(replyBadge(appeal({}))).toMatchObject({ cls: 'amber', text: 'Pending' });
  });
});

describe('isInteractiveTarget', () => {
  it('lets links and buttons inside a clickable row handle their own clicks', () => {
    const cell = document.createElement('td');
    const link = document.createElement('a');
    const icon = document.createElement('i');
    link.appendChild(icon);
    cell.appendChild(link);

    expect(isInteractiveTarget({ target: icon } as unknown as Event)).toBe(true);
    expect(isInteractiveTarget({ target: cell } as unknown as Event)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { deadlineChip } from './deadlines';

describe('deadlineChip', () => {
  it('flags overdue and same-day deadlines in red', () => {
    expect(deadlineChip({ daysRemaining: -3, overdue: true })).toEqual({ cls: 'red', text: 'Overdue 3 days' });
    expect(deadlineChip({ daysRemaining: -1, overdue: true })).toEqual({ cls: 'red', text: 'Overdue 1 day' });
    expect(deadlineChip({ daysRemaining: 0, overdue: false })).toEqual({ cls: 'red', text: 'Today' });
  });

  it('warns within a week and stays quiet beyond it', () => {
    expect(deadlineChip({ daysRemaining: 1, overdue: false })).toEqual({ cls: 'amber', text: 'Tomorrow' });
    expect(deadlineChip({ daysRemaining: 7, overdue: false })).toEqual({ cls: 'amber', text: 'In 7 days' });
    expect(deadlineChip({ daysRemaining: 20, overdue: false })).toEqual({ cls: 'grey', text: 'In 20 days' });
  });
});

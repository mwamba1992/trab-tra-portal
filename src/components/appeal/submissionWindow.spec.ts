import { describe, expect, it, vi, afterEach } from 'vitest';
import { daysToDeadline, windowState } from './submissionWindow';
import type { SubmissionWindow } from '@/service/tra';

const win = (over: Partial<SubmissionWindow>): SubmissionWindow => ({
  hearingDate: '2026-09-25',
  venue: 'Dar es Salaam',
  deadline: '2026-09-22',
  open: true,
  submissions: [],
  ...over,
});

const freeze = (iso: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${iso}T09:00:00Z`));
};

afterEach(() => vi.useRealTimers());

describe('daysToDeadline', () => {
  it('counts whole days to the closing day', () => {
    expect(daysToDeadline('2026-09-22', new Date('2026-09-16T09:00:00Z'))).toBe(6);
  });
});

describe('windowState', () => {
  it('waits for a hearing to be scheduled', () => {
    const state = windowState(win({ hearingDate: null, deadline: null, open: false }));
    expect(state.tone).toBe('grey');
  });

  it('warns on the last day', () => {
    freeze('2026-09-22');
    expect(windowState(win({})).tone).toBe('gold');
  });

  it('reports a shut window', () => {
    freeze('2026-09-24');
    const state = windowState(win({ open: false }));
    expect(state.tone).toBe('red');
    expect(state.message).toContain('2026-09-22');
  });
});

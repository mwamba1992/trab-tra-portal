import { SUBMISSION_CUTOFF_DAYS, type SubmissionWindow } from '@/service/tra';

const DAY_MS = 86_400_000;

const dayStart = (isoDate: string) => {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole days left to file, negative once the window has closed. */
export function daysToDeadline(deadline: string, now: Date = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((dayStart(deadline) - today) / DAY_MS);
}

export interface WindowState {
  tone: 'grey' | 'gold' | 'red' | 'green';
  message: string;
}

/** How the filing window reads to the officer. */
export function windowState(win: SubmissionWindow | null): WindowState {
  if (!win?.hearingDate || !win.deadline) return { tone: 'grey', message: 'Submissions open once a hearing is scheduled for this appeal.' };

  const days = daysToDeadline(win.deadline);
  if (!win.open || days < 0)
    return {
      tone: 'red',
      message: `Submissions closed on ${win.deadline}, ${SUBMISSION_CUTOFF_DAYS} days before the hearing sits.`,
    };
  if (days === 0) return { tone: 'gold', message: `Today is the last day to file — submissions close on ${win.deadline}.` };
  if (days === 1) return { tone: 'gold', message: `One day left — submissions close on ${win.deadline}.` };
  return { tone: 'green', message: `${days} days left — submissions close on ${win.deadline}.` };
}

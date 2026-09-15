import type { CaseDeadline, DeadlineKind } from '@/service/tra';

export const DEADLINE_LABELS: Record<DeadlineKind, string> = {
  REPLY: 'Statement of reply',
  TRIBUNAL_APPEAL: 'Appeal to Tribunal',
  HEARING: 'Hearing',
};

export const DEADLINE_ICONS: Record<DeadlineKind, string> = {
  REPLY: 'pi-pencil',
  TRIBUNAL_APPEAL: 'pi-directions',
  HEARING: 'pi-calendar-clock',
};

export interface DeadlineChip {
  cls: 'red' | 'amber' | 'grey';
  text: string;
}

const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** Urgency chip: overdue and today in red, within a week in amber. */
export function deadlineChip(d: Pick<CaseDeadline, 'daysRemaining' | 'overdue'>): DeadlineChip {
  if (d.overdue || d.daysRemaining < 0) return { cls: 'red', text: `Overdue ${plural(Math.abs(d.daysRemaining))}` };
  if (d.daysRemaining === 0) return { cls: 'red', text: 'Today' };
  if (d.daysRemaining === 1) return { cls: 'amber', text: 'Tomorrow' };
  return { cls: d.daysRemaining <= 7 ? 'amber' : 'grey', text: `In ${plural(d.daysRemaining)}` };
}

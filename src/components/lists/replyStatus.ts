import type { Appeal, ReplyState } from '@/service/tra';
import { formatDate } from '@/utils/format';

export interface ReplyBadge {
  cls: 'green' | 'red' | 'amber' | 'grey';
  text: string;
  title: string;
}

// Mirrors backend tra/appeal-list-filter.util.ts (fallback if replyStatus is absent).
const CLOSED_STATUSES = ['CONCLUDED', 'DECIDED'];

function stateOf(a: Appeal): ReplyState {
  if (a.replyStatus) return a.replyStatus;
  const closed =
    a.caseClosed ?? (CLOSED_STATUSES.includes(a.statusTrend) || (!!a.outcomeOfDecision && a.outcomeOfDecision !== 'NO DECISION'));
  if (a.traReplied) return 'REPLIED';
  if (closed) return 'NOT_REQUIRED';
  return a.overdue ? 'OVERDUE' : 'PENDING';
}

/** Reply column badge. Overdue / countdown only for open cases; closed cases show "Not required". */
export function replyBadge(a: Appeal): ReplyBadge {
  const due = a.replyDueDate ? `Due ${formatDate(a.replyDueDate)}` : '';
  switch (stateOf(a)) {
    case 'REPLIED':
      return a.repliedAt
        ? { cls: 'green', text: `Filed ${formatDate(a.repliedAt)}`, title: 'Reply filed' }
        : { cls: 'green', text: 'Replied', title: 'Reply filed' };
    case 'NOT_REQUIRED':
      return { cls: 'grey', text: 'Not required', title: 'Case closed: no reply expected' };
    case 'OVERDUE':
      return { cls: 'red', text: 'Overdue', title: due };
    default: {
      const d = a.daysRemaining;
      if (d === null || d === undefined) return { cls: 'amber', text: 'Pending', title: due };
      return { cls: d <= 7 ? 'amber' : 'grey', text: `${d}d left`, title: due };
    }
  }
}

/** True when a click landed on an interactive element that handles itself (link, button, field). */
export function isInteractiveTarget(event: Event): boolean {
  const target = event.target;
  return target instanceof Element && !!target.closest('a, button, input, select, textarea, label');
}

import type { DecisionActionRecord, DecisionActionType } from '@/service/tra';

export const DECISION_ACTION_LABELS: Record<DecisionActionType, string> = {
  REFUND_ISSUED: 'Refund issued',
  ASSESSMENT_REVISED: 'Assessment revised',
  TAX_ENFORCED: 'Tax enforced',
  APPEAL_TO_TRIBUNAL: 'Appealed to the Tribunal',
  NO_ACTION_REQUIRED: 'No action required',
};

export const DECISION_ACTION_OPTIONS = (Object.keys(DECISION_ACTION_LABELS) as DecisionActionType[]).map((value) => ({
  value,
  label: DECISION_ACTION_LABELS[value],
}));

export interface ActionBadge {
  cls: 'green' | 'amber' | 'grey' | 'red';
  text: string;
}

/** Badge for the TRA Action column; a decided appeal with nothing recorded still needs attention. */
export function decisionActionBadge(action: DecisionActionRecord | null | undefined): ActionBadge {
  if (!action) return { cls: 'amber', text: 'Not recorded' };
  if (action.action === 'NO_ACTION_REQUIRED') return { cls: 'grey', text: DECISION_ACTION_LABELS.NO_ACTION_REQUIRED };
  if (action.action === 'APPEAL_TO_TRIBUNAL') return { cls: 'red', text: DECISION_ACTION_LABELS.APPEAL_TO_TRIBUNAL };
  return { cls: 'green', text: DECISION_ACTION_LABELS[action.action] };
}

/** Same rule as the backend (tra/decision-action.util.ts). */
export function decisionActionProblem(input: { action: DecisionActionType; details?: string }): string {
  if (input.action !== 'NO_ACTION_REQUIRED' && !input.details?.trim()) return 'Say what TRA did, so the Board and auditors can follow it.';
  return '';
}

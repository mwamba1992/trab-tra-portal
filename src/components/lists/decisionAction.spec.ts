import { describe, expect, it } from 'vitest';
import type { DecisionActionRecord } from '@/service/tra';
import { decisionActionBadge, decisionActionProblem, DECISION_ACTION_OPTIONS } from './decisionAction';

const record = (action: DecisionActionRecord['action']): DecisionActionRecord => ({
  id: 'a1',
  action,
  details: null,
  actionDate: null,
  recordedByName: null,
  updatedAt: '2026-09-15T08:00:00Z',
});

describe('decision action', () => {
  it('flags decided appeals with nothing recorded', () => {
    expect(decisionActionBadge(null)).toEqual({ cls: 'amber', text: 'Not recorded' });
  });

  it('separates compliance from an onward appeal', () => {
    expect(decisionActionBadge(record('REFUND_ISSUED'))).toEqual({ cls: 'green', text: 'Refund issued' });
    expect(decisionActionBadge(record('APPEAL_TO_TRIBUNAL')).cls).toBe('red');
    expect(decisionActionBadge(record('NO_ACTION_REQUIRED')).cls).toBe('grey');
  });

  it('requires details unless nothing was required', () => {
    expect(decisionActionProblem({ action: 'TAX_ENFORCED' })).toBe('Say what TRA did, so the Board and auditors can follow it.');
    expect(decisionActionProblem({ action: 'TAX_ENFORCED', details: 'Demand notice issued' })).toBe('');
    expect(decisionActionProblem({ action: 'NO_ACTION_REQUIRED' })).toBe('');
    expect(DECISION_ACTION_OPTIONS).toHaveLength(5);
  });
});

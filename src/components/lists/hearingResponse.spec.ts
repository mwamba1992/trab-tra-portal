import { describe, expect, it } from 'vitest';
import type { HearingResponse } from '@/service/tra';
import { hearingResponseBadge, hearingResponseProblem } from './hearingResponse';

const response = (attendance: HearingResponse['attendance']): HearingResponse => ({
  id: 'r1',
  attendance,
  appearingCounsel: null,
  witnesses: null,
  remarks: null,
  respondedByName: null,
  updatedAt: '2026-09-15T08:00:00Z',
});

describe('hearing response', () => {
  it('flags open summons without a response', () => {
    expect(hearingResponseBadge(null, 'SERVED')).toEqual({ cls: 'red', text: 'Awaiting response' });
    expect(hearingResponseBadge(null, 'CONCLUDED')).toEqual({ cls: 'grey', text: 'No response' });
  });

  it('labels each attendance choice', () => {
    expect(hearingResponseBadge(response('ATTENDING'), 'SERVED').text).toBe('Attending');
    expect(hearingResponseBadge(response('ADJOURNMENT_REQUESTED'), 'SERVED').text).toBe('Adjournment requested');
    expect(hearingResponseBadge(response('NOT_ATTENDING'), 'SERVED').text).toBe('Not attending');
  });

  it('asks for counsel when attending and a reason otherwise', () => {
    expect(hearingResponseProblem({ attendance: 'ATTENDING' })).toBe('Name the counsel or officer appearing for TRA.');
    expect(hearingResponseProblem({ attendance: 'ATTENDING', appearingCounsel: 'Adv. J. Mushi' })).toBe('');
    expect(hearingResponseProblem({ attendance: 'NOT_ATTENDING', remarks: '' })).toBe('Give the reason TRA will not attend.');
  });
});

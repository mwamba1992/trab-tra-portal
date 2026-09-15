import type { Attendance, HearingResponse } from '@/service/tra';

export const ATTENDANCE_OPTIONS: { value: Attendance; label: string }[] = [
  { value: 'ATTENDING', label: 'TRA will attend' },
  { value: 'ADJOURNMENT_REQUESTED', label: 'Request an adjournment' },
  { value: 'NOT_ATTENDING', label: 'TRA will not attend' },
];

export interface ResponseBadge {
  cls: 'green' | 'amber' | 'red' | 'grey';
  text: string;
}

/** Badge for the TRA Response column; an open summons with no response needs attention. */
export function hearingResponseBadge(response: HearingResponse | null | undefined, summonsStatus: string | undefined): ResponseBadge {
  if (!response) return summonsStatus === 'CONCLUDED' ? { cls: 'grey', text: 'No response' } : { cls: 'red', text: 'Awaiting response' };
  if (response.attendance === 'ATTENDING') return { cls: 'green', text: 'Attending' };
  if (response.attendance === 'ADJOURNMENT_REQUESTED') return { cls: 'amber', text: 'Adjournment requested' };
  return { cls: 'red', text: 'Not attending' };
}

/** Same rules as the backend (tra/hearing-response.util.ts), so the form can explain before saving. */
export function hearingResponseProblem(input: { attendance: Attendance; appearingCounsel?: string; remarks?: string }): string {
  if (input.attendance === 'ATTENDING' && !input.appearingCounsel?.trim()) return 'Name the counsel or officer appearing for TRA.';
  if (input.attendance === 'ADJOURNMENT_REQUESTED' && !input.remarks?.trim()) return 'Give the reason for requesting an adjournment.';
  if (input.attendance === 'NOT_ATTENDING' && !input.remarks?.trim()) return 'Give the reason TRA will not attend.';
  return '';
}

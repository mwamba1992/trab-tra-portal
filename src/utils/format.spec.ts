import { describe, it, expect } from 'vitest';
import { formatDate, humanize, isoDate, toCsv } from './format';
import { apiErrorMessage } from './errors';

describe('format utilities', () => {
  it('uses the local calendar day, not UTC', () => {
    // 00:30 in Dar es Salaam is still the previous day in UTC
    expect(isoDate(new Date(2026, 8, 14, 0, 30))).toBe('2026-09-14');
  });

  it('shows every date the same way', () => {
    expect(formatDate('2026-09-04')).toBe('4 Sep 2026');
    expect(formatDate(new Date(2026, 0, 31))).toBe('31 Jan 2026');
    expect(formatDate(null)).toBe('-');
    expect(formatDate('not a date')).toBe('-');
  });

  it('turns backend enum values into labels', () => {
    expect(humanize('HEARING_SCHEDULED')).toBe('Hearing scheduled');
    expect(humanize(undefined)).toBe('-');
  });

  it('escapes CSV cells and neutralises spreadsheet formulas', () => {
    expect(
      toCsv(
        ['Appellant', 'Note'],
        [
          ['ACME, Ltd', 'Said "hi"'],
          ['=HYPERLINK("x")', null],
        ],
      ),
    ).toBe('Appellant,Note\n"ACME, Ltd","Said ""hi"""\n"\'=HYPERLINK(""x"")",');
  });
});

describe('apiErrorMessage', () => {
  it('prefers the backend message and joins validation errors', () => {
    expect(apiErrorMessage({ response: { data: { message: 'Invalid credentials' } } })).toBe('Invalid credentials');
    expect(apiErrorMessage({ response: { data: { message: ['phone must be valid', 'role is required'] } } })).toBe(
      'phone must be valid, role is required',
    );
    expect(apiErrorMessage(new Error('Network Error'), 'Could not load appeals')).toBe('Could not load appeals');
  });
});

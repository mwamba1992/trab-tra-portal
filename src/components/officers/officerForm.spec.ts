import { describe, it, expect } from 'vitest';
import { emptyForm, formFromOfficer, roleLabel, validateOfficer } from './officerForm';
import type { OfficerRecord } from '@/service/tra';

const officer = (overrides: Partial<OfficerRecord> = {}): OfficerRecord =>
  ({
    id: 'o1',
    firstName: 'Peter',
    lastName: 'Auma',
    email: 'peter@tra.go.tz',
    status: 'active',
    role: { name: 'tra-officer' },
    ...overrides,
  }) as OfficerRecord;

describe('officer form', () => {
  it('requires names, email and an initial password for a new officer', () => {
    expect(validateOfficer(emptyForm(), null)).toEqual({
      firstName: 'First name is required.',
      lastName: 'Last name is required.',
      email: 'Email is required.',
      password: 'An initial password is required.',
    });
    expect(validateOfficer({ ...emptyForm(), firstName: 'A', lastName: 'B', email: 'not-an-email', password: 'x' }, null)).toEqual({
      email: 'Enter a valid email address.',
    });
  });

  it('accepts the phone formats the backend accepts', () => {
    const base = { ...emptyForm(), firstName: 'A', lastName: 'B', email: 'a@tra.go.tz', password: 'secret' };
    for (const phone of ['0712345678', '255712345678', '+255712345678']) {
      expect(validateOfficer({ ...base, phone }, null)).toEqual({});
    }
    expect(validateOfficer({ ...base, phone: '071234' }, null).phone).toMatch(/valid phone/);
  });

  it('does not ask for email or password when editing, but keeps a saved phone', () => {
    const existing = officer({ phone: '0712345678' });
    const form = formFromOfficer(existing);
    expect(form.password).toBe('');
    expect(validateOfficer(form, existing)).toEqual({});
    expect(validateOfficer({ ...form, phone: '' }, existing).phone).toMatch(/cannot be removed/);
  });

  it('maps the tra-admin role to the administrator option', () => {
    expect(formFromOfficer(officer({ role: { name: 'tra-admin' } })).role).toBe('admin');
    expect(roleLabel(officer({ role: { name: 'tra-admin' } }))).toBe('Admin');
    expect(roleLabel(officer())).toBe('Officer');
  });
});

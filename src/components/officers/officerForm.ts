import type { OfficerRecord } from '@/service/tra';

/** Mirrors backend tra/dto/officer.dto.ts: 0XXXXXXXXX, 255XXXXXXXXX or +255XXXXXXXXX. */
export const PHONE_REGEX = /^(\+?255|0)[0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type OfficerRole = 'officer' | 'admin';

export interface OfficerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: OfficerRole;
}

export type OfficerFormErrors = Partial<Record<keyof OfficerFormValues, string>>;

export const isAdminOfficer = (o: Pick<OfficerRecord, 'role'>): boolean => o.role?.name === 'tra-admin';

export const roleLabel = (o: Pick<OfficerRecord, 'role'>): string => (isAdminOfficer(o) ? 'Admin' : 'Officer');

export const fullName = (o: Pick<OfficerRecord, 'firstName' | 'lastName'>): string => `${o.firstName} ${o.lastName}`.trim();

export function emptyForm(): OfficerFormValues {
  return { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'officer' };
}

export function formFromOfficer(o: OfficerRecord): OfficerFormValues {
  return {
    firstName: o.firstName,
    lastName: o.lastName,
    email: o.email,
    phone: o.phone ?? '',
    password: '',
    role: isAdminOfficer(o) ? 'admin' : 'officer',
  };
}

/** Client-side checks matching the backend DTO. `original` is set when editing. */
export function validateOfficer(v: OfficerFormValues, original: OfficerRecord | null): OfficerFormErrors {
  const errors: OfficerFormErrors = {};
  if (!v.firstName.trim()) errors.firstName = 'First name is required.';
  if (!v.lastName.trim()) errors.lastName = 'Last name is required.';

  const phone = v.phone.trim();
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.phone = 'Enter a valid phone number, e.g. 0712345678 or 255712345678.';
  } else if (!phone && original?.phone) {
    errors.phone = 'A saved phone number cannot be removed; enter a valid number.';
  }

  if (!original) {
    const email = v.email.trim();
    if (!email) errors.email = 'Email is required.';
    else if (!EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email address.';
    if (!v.password) errors.password = 'An initial password is required.';
  }
  return errors;
}

import { describe, it, expect } from 'vitest';
import { safeRedirect } from './index';

describe('safeRedirect', () => {
  it('accepts in-app paths only', () => {
    expect(safeRedirect('/appeals/42?tab=documents')).toBe('/appeals/42?tab=documents');
    expect(safeRedirect(['/summons'])).toBe('/summons');
  });

  it('rejects external, protocol-relative and login redirects', () => {
    expect(safeRedirect('https://evil.example')).toBeNull();
    expect(safeRedirect('//evil.example')).toBeNull();
    expect(safeRedirect('/\\evil.example')).toBeNull();
    expect(safeRedirect('/login?redirect=/x')).toBeNull();
    expect(safeRedirect(undefined)).toBeNull();
  });
});

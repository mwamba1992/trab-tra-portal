import { describe, it, expect, beforeEach } from 'vitest';
import { accessToken, clearSession, hasActiveSession, isTokenValid, refreshToken, saveSession } from './session';
import { makeToken } from '@/test/tokens';

const user = { id: 'u1', firstName: 'Asha', lastName: 'Juma', email: 'asha@tra.go.tz', role: 'TRA_OFFICER', permissions: [] };

describe('session', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
  });

  it('keeps an officer signed in while the refresh token is still valid', () => {
    saveSession({ accessToken: makeToken(-60), refreshToken: makeToken(3600), user });
    expect(isTokenValid(accessToken.value)).toBe(false);
    expect(hasActiveSession()).toBe(true);

    saveSession({ accessToken: makeToken(-60), refreshToken: makeToken(-60), user });
    expect(hasActiveSession()).toBe(false);
  });

  it('treats malformed tokens as expired', () => {
    expect(isTokenValid('not-a-jwt')).toBe(false);
    expect(isTokenValid(`a.${btoa('{"exp":"soon"}')}.c`)).toBe(false);
    expect(isTokenValid(null)).toBe(false);
  });

  it('signs out without wiping storage that belongs to other apps on the origin', () => {
    localStorage.setItem('other_app_setting', 'keep');
    saveSession({ accessToken: makeToken(600), refreshToken: makeToken(3600), user });

    clearSession();

    expect(localStorage.getItem('tra_access_token')).toBeNull();
    expect(localStorage.getItem('tra_user')).toBeNull();
    expect(refreshToken.value).toBeNull();
    expect(localStorage.getItem('other_app_setting')).toBe('keep');
  });
});

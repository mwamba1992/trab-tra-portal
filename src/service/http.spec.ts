import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import axios, { AxiosError, type AxiosAdapter, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { makeToken } from '@/test/tokens';
import type * as SessionModule from './session';

type Handler = (config: InternalAxiosRequestConfig) => Promise<{ status: number; data: unknown }>;

let handler: Handler;
// Both the API client and its private refresh client are created from axios defaults
const adapter: AxiosAdapter = async (config) => {
  const { status, data } = await handler(config);
  const response = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 400) throw new AxiosError(`Request failed with ${status}`, 'ERR_BAD_REQUEST', config, null, response);
  return response;
};

let http: AxiosInstance;
let setSessionExpiredHandler: (fn: () => void) => void;
let session: typeof SessionModule;

beforeAll(async () => {
  axios.defaults.adapter = adapter;
  ({ default: http, setSessionExpiredHandler } = await import('./http'));
  session = await import('./session');
});

const user = { id: 'u1', firstName: 'Asha', lastName: 'Juma', email: 'asha@tra.go.tz', role: 'TRA_OFFICER', permissions: [] };

describe('http client session handling', () => {
  let expired: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    localStorage.clear();
    session.clearSession();
    expired = vi.fn<() => void>();
    setSessionExpiredHandler(expired);
  });

  it('refreshes once for concurrent 401s and retries each request with the new token', async () => {
    const oldToken = makeToken(600);
    const newToken = makeToken(900, { renewed: true });
    session.saveSession({ accessToken: oldToken, refreshToken: makeToken(3600), user });
    const refreshCalls = vi.fn();

    handler = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshCalls();
        return { status: 200, data: { data: { accessToken: newToken, refreshToken: makeToken(7200), user } } };
      }
      if (config.headers.Authorization === `Bearer ${oldToken}`) return { status: 401, data: {} };
      return { status: 200, data: { url: config.url } };
    };

    const results = await Promise.all([http.get('/tra/dashboard'), http.get('/tra/appeals'), http.get('/tra/summons')]);

    expect(refreshCalls).toHaveBeenCalledTimes(1);
    expect(results.map((r) => (r.data as { url: string }).url)).toEqual(['/tra/dashboard', '/tra/appeals', '/tra/summons']);
    expect(session.accessToken.value).toBe(newToken);
    expect(expired).not.toHaveBeenCalled();
  });

  it('returns a failed sign-in to the login form instead of redirecting', async () => {
    handler = async () => ({ status: 401, data: { message: 'Invalid credentials' } });

    await expect(http.post('/auth/tra/login', { email: 'x@tra.go.tz', password: 'wrong' })).rejects.toMatchObject({
      response: { data: { message: 'Invalid credentials' } },
    });
    expect(expired).not.toHaveBeenCalled();
  });

  it('ends the session when the refresh token is rejected', async () => {
    session.saveSession({ accessToken: makeToken(600), refreshToken: makeToken(3600), user });
    handler = async () => ({ status: 401, data: {} });

    await expect(http.get('/tra/appeals')).rejects.toBeInstanceOf(AxiosError);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('tra_refresh_token')).toBeNull();
  });
});

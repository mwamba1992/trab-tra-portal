/** Unsigned JWT whose `exp` is `secondsFromNow` in the future (negative = already expired). */
export function makeToken(secondsFromNow: number, extra: Record<string, unknown> = {}): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'officer-1', exp, ...extra })}.signature`;
}

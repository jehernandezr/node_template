import { SessionCookie } from '../../cookies/session-cookie.js';

describe('SessionCookie', () => {
  const cookie = new SessionCookie();

  it('reads the session token by its name', () => {
    expect(cookie.read('theme=dark; __Host-session=st1_abc')).toBe('st1_abc');
  });

  it('reads the first header when several arrive', () => {
    expect(cookie.read(['__Host-session=first', '__Host-session=second'])).toBe(
      'first',
    );
  });

  it('returns undefined without the session cookie', () => {
    expect(cookie.read('theme=dark')).toBeUndefined();
    expect(cookie.read(undefined)).toBeUndefined();
  });

  it('serializes the cookie with the required attributes and no domain', () => {
    expect(cookie.serialize('st1_a b', 86_400_000)).toBe(
      '__Host-session=st1_a%20b; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Strict',
    );
  });

  it('rounds the max age down to whole seconds', () => {
    expect(cookie.serialize('t', 1_999)).toContain('Max-Age=1;');
  });

  it('serializes the clearing cookie with a zero max age', () => {
    expect(cookie.serializeClear()).toBe(
      '__Host-session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict',
    );
  });
});

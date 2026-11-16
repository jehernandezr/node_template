import { randomBytes } from 'node:crypto';
import { encodeOpaqueToken, parseOpaqueToken } from '../opaque-token.js';

describe('opaque token', () => {
  it('round-trips the route and the secret', () => {
    const secret = randomBytes(32);

    const token = encodeOpaqueToken('st1', ['tenant-a', 'user-b'], secret);
    const parsed = parseOpaqueToken(token, 'st1', 2);

    expect(token.startsWith('st1_tenant-a_user-b_')).toBe(true);
    expect(parsed?.route).toEqual(['tenant-a', 'user-b']);
    expect(parsed?.secret.equals(secret)).toBe(true);
  });

  it('accepts secrets whose base64url text contains underscores', () => {
    const secret = Buffer.from([0xff, 0xff, 0xff, 0xfe]);
    const token = encodeOpaqueToken('sk', ['key'], secret);

    expect(token.slice(3)).toContain('_');
    expect(parseOpaqueToken(token, 'sk', 1)?.secret.equals(secret)).toBe(true);
  });

  it.each([
    ['empty part', ''],
    ['underscore in part', 'a_b'],
  ])('refuses to encode a route part with %s', (_, part) => {
    expect(() => encodeOpaqueToken('st1', [part], randomBytes(8))).toThrow(
      'Invalid opaque token route part',
    );
  });

  it('returns undefined for a different prefix', () => {
    const token = encodeOpaqueToken('st1', ['t'], randomBytes(8));

    expect(parseOpaqueToken(token, 'sk', 1)).toBeUndefined();
  });

  it('returns undefined when the token has fewer parts than expected', () => {
    const token = encodeOpaqueToken('st1', ['t'], Buffer.alloc(16, 0x41));

    expect(parseOpaqueToken(token, 'st1', 2)).toBeUndefined();
  });

  it('returns undefined for a secret outside base64url', () => {
    expect(parseOpaqueToken('st1_t_abc+def', 'st1', 1)).toBeUndefined();
  });

  it('returns undefined for an empty secret', () => {
    expect(parseOpaqueToken('st1_t_', 'st1', 1)).toBeUndefined();
  });
});

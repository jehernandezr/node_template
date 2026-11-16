import { randomBytes } from 'node:crypto';
import { constantTimeEquals } from '../constant-time.js';

describe('constantTimeEquals', () => {
  it('accepts equal strings and equal bytes', () => {
    const secret = randomBytes(32);

    expect(constantTimeEquals('ana@example.com', 'ana@example.com')).toBe(true);
    expect(constantTimeEquals(secret, Buffer.from(secret))).toBe(true);
  });

  it('rejects a single differing byte', () => {
    const secret = randomBytes(32);
    const other = Buffer.from(secret);
    other[31] = (other[31] ?? 0) ^ 1;

    expect(constantTimeEquals(secret, other)).toBe(false);
  });

  it('returns false for different lengths without throwing', () => {
    expect(() => constantTimeEquals('abc', 'abcd')).not.toThrow();
    expect(constantTimeEquals('abc', 'abcd')).toBe(false);
    expect(constantTimeEquals(new Uint8Array(0), randomBytes(1))).toBe(false);
  });

  it('compares a string with its UTF-8 bytes', () => {
    expect(constantTimeEquals('ñ', Buffer.from('ñ', 'utf8'))).toBe(true);
  });
});

import { randomBytes } from 'node:crypto';
import { decodeBase64Url, encodeBase64Url } from '../base64url.js';

describe('base64url', () => {
  it('round-trips random bytes without padding', () => {
    const bytes = randomBytes(33);

    const text = encodeBase64Url(bytes);

    expect(text).not.toMatch(/[+/=]/);
    expect(decodeBase64Url(text).equals(bytes)).toBe(true);
  });

  it('encodes the empty array as the empty string', () => {
    expect(encodeBase64Url(new Uint8Array())).toBe('');
    expect(decodeBase64Url('').byteLength).toBe(0);
  });

  it.each(['+', '/', '=', ' ', 'ñ'])(
    'rejects the character %j outside the alphabet',
    (character) => {
      expect(() => decodeBase64Url(`abc${character}def`)).toThrow(
        'Invalid base64url text',
      );
    },
  );

  it('accepts the url-safe characters - and _', () => {
    expect(decodeBase64Url('-_8').byteLength).toBeGreaterThan(0);
  });
});

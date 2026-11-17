import { TotpAlgorithm } from '../totp-algorithm.js';

/** Secreto SHA-1 de los vectores del apéndice B de RFC 6238. */
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');

describe('TotpAlgorithm', () => {
  const totp = new TotpAlgorithm();

  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ])('matches the RFC 6238 vector at %i s', (seconds, expected) => {
    expect(totp.code(RFC_SECRET, totp.step(seconds * 1000), 8)).toBe(expected);
  });

  it('accepts one step of drift on each side and nothing beyond', () => {
    const at = 1_700_000_000_000;
    const step = totp.step(at);

    expect(totp.match(RFC_SECRET, totp.code(RFC_SECRET, step - 1), at)).toBe(
      step - 1,
    );
    expect(totp.match(RFC_SECRET, totp.code(RFC_SECRET, step + 1), at)).toBe(
      step + 1,
    );
    expect(
      totp.match(RFC_SECRET, totp.code(RFC_SECRET, step + 2), at),
    ).toBeUndefined();
  });
});

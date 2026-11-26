import { TotpCode } from '../totp-code.js';

describe('TotpCode', () => {
  const RFC_6238_SHA1_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it.each([
    [59, '94287082'],
    [1_111_111_109, '07081804'],
    [1_234_567_890, '89005924'],
    [20_000_000_000, '65353130'],
  ])('matches the RFC 6238 SHA-1 vector at %i s', (seconds, code) => {
    expect(TotpCode.at(RFC_6238_SHA1_SECRET, seconds * 1000, 8)).toBe(code);
  });

  it('gives six digits by default, as authenticator apps do', () => {
    expect(TotpCode.at(RFC_6238_SHA1_SECRET, 59_000)).toBe('287082');
  });

  it('reads a lowercase and padded secret', () => {
    expect(TotpCode.at('gezdgnbvgy3tqojqgezdgnbvgy3tqojq====', 59_000)).toBe(
      '287082',
    );
  });
});

import { InvalidArgumentError } from '../../errors/invalid-argument.error.js';
import { ClaimRules } from '../claim-rules.js';

describe('ClaimRules.computeLeaseUntil', () => {
  it('adds the default margin to the deadline', () => {
    expect(
      ClaimRules.computeLeaseUntil({ deadline: { atMs: 10_000 } }, 0),
    ).toBe(10_000 + ClaimRules.DEFAULT_LEASE_MARGIN_MS);
  });

  it('honours a custom margin', () => {
    expect(
      ClaimRules.computeLeaseUntil(
        { deadline: { atMs: 1000 }, leaseMarginMs: 10 },
        0,
      ),
    ).toBe(1010);
  });

  it('never gives less than minLeaseMs from now', () => {
    expect(
      ClaimRules.computeLeaseUntil(
        { deadline: { atMs: 1000 }, leaseMarginMs: 0, minLeaseMs: 60_000 },
        5000,
      ),
    ).toBe(65_000);
  });

  it.each([
    ['leaseMarginMs', { leaseMarginMs: -1 }],
    ['minLeaseMs', { minLeaseMs: Infinity }],
  ])('rejects an invalid %s', (_name, extra) => {
    expect(() =>
      ClaimRules.computeLeaseUntil({ deadline: { atMs: 1 }, ...extra }, 0),
    ).toThrow(InvalidArgumentError);
  });
});

describe('ClaimRules.assertInput', () => {
  it('accepts a key and a fingerprint within limits', () => {
    expect(() =>
      ClaimRules.assertInput(
        'k'.repeat(ClaimRules.MAX_KEY_LENGTH),
        'f'.repeat(ClaimRules.MAX_FINGERPRINT_LENGTH),
      ),
    ).not.toThrow();
  });

  it.each([
    ['empty key', '', 'f'],
    ['long key', 'k'.repeat(ClaimRules.MAX_KEY_LENGTH + 1), 'f'],
    ['non-string key', 5 as unknown as string, 'f'],
    ['empty fingerprint', 'k', ''],
    [
      'long fingerprint',
      'k',
      'f'.repeat(ClaimRules.MAX_FINGERPRINT_LENGTH + 1),
    ],
    ['non-string fingerprint', 'k', 5 as unknown as string],
  ])('rejects %s', (_label, key, fingerprint) => {
    expect(() => ClaimRules.assertInput(key, fingerprint)).toThrow(
      InvalidArgumentError,
    );
  });
});

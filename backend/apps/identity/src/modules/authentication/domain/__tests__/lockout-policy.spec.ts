import { LockoutPolicy } from '../lockout-policy.js';

const MINUTE_MS = 60_000;

describe('LockoutPolicy', () => {
  const policy = new LockoutPolicy();

  it.each([
    [1, 15],
    [2, 30],
    [3, 60],
    [7, 960],
    [8, 1440],
    [20, 1440],
  ])(
    'locks an origin for the lock number %i during %i minutes',
    (level, minutes) => {
      expect(policy.originLockMs(level)).toBe(minutes * MINUTE_MS);
    },
  );

  it('locks the origin at five failures, the IP at fifty and enables protected mode once at twenty', () => {
    expect(policy.locksOrigin(4)).toBe(false);
    expect(policy.locksOrigin(5)).toBe(true);
    expect(policy.locksIp(49)).toBe(false);
    expect(policy.locksIp(50)).toBe(true);
    expect(policy.enablesProtectedMode(19)).toBe(false);
    expect(policy.enablesProtectedMode(20)).toBe(true);
  });
});

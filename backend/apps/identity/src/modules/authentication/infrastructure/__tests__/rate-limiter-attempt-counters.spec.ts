import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryRateLimiter, StrictRateLimiter } from '@platform/rate-limit';
import { LockoutRules } from '../../../../shared/constants/lockout.constants.js';
import { RateLimiterAttemptCounters } from '../rate-limiter-attempt-counters.js';

class CountersHarness {
  readonly clock = new FixedClock(new Date('2026-11-16T10:00:00.000Z'));
  readonly counters = new RateLimiterAttemptCounters(
    new StrictRateLimiter(new InMemoryRateLimiter({ clock: this.clock })),
  );
}

describe('RateLimiterAttemptCounters', () => {
  it('counts each dimension on its own', async () => {
    const { counters } = new CountersHarness();
    await counters.recordFailure('account:1:ip-a', 'account', 'ip-a');

    const counts = await counters.recordFailure(
      'account:1:ip-b',
      'account',
      'ip-a',
    );

    expect(counts).toEqual({ origin: 1, account: 2, ip: 2 });
  });

  it('stops counting an origin at its lock threshold', async () => {
    const { counters } = new CountersHarness();
    for (
      let attempt = 0;
      attempt < LockoutRules.origin.maxFailures;
      attempt += 1
    ) {
      await counters.recordFailure(
        'account:1:ip-a',
        `account-${attempt}`,
        `ip-${attempt}`,
      );
    }

    const counts = await counters.recordFailure(
      'account:1:ip-a',
      'other',
      'ip-z',
    );

    expect(counts.origin).toBe(LockoutRules.origin.maxFailures);
  });

  it('forgets an origin or an account when asked', async () => {
    const { counters } = new CountersHarness();
    await counters.recordFailure('account:1:ip-a', 'account', 'ip-a');

    await counters.clearOrigin('account:1:ip-a');
    await counters.clearAccount('account');
    const counts = await counters.recordFailure(
      'account:1:ip-a',
      'account',
      'ip-a',
    );

    expect(counts).toEqual({ origin: 1, account: 1, ip: 2 });
  });

  it('lets the failures of an origin expire with its window', async () => {
    const { clock, counters } = new CountersHarness();
    await counters.recordFailure('account:1:ip-a', 'account', 'ip-a');
    clock.advance(2 * LockoutRules.origin.windowMs);

    const counts = await counters.recordFailure(
      'account:1:ip-a',
      'account',
      'ip-a',
    );

    expect(counts.origin).toBe(1);
  });
});

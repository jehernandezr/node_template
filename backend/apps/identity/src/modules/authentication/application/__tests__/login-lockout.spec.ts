import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryEphemeralStore } from '../../../../__tests__/utils/index.js';
import { LockoutRules } from '../../../../shared/constants/lockout.constants.js';
import { TestLoginLockout } from '../../__tests__/utils/index.js';

const IP = '203.0.113.10';
const MINUTE_MS = 60_000;

class LockoutHarness {
  readonly clock = new FixedClock(new Date('2026-11-16T10:00:00.000Z'));
  private readonly fixture = new TestLoginLockout(
    new InMemoryEphemeralStore(this.clock),
    this.clock,
  );
  readonly lockout = this.fixture.lockout;
  readonly account = this.fixture.keys.account('ana@example.com');

  /** Falla `times` veces la cuenta desde la IP dada y devuelve el último resultado. */
  async failFrom(ip: string, times: number) {
    const outcomes = [];
    for (let attempt = 0; attempt < times; attempt += 1) {
      outcomes.push(await this.lockout.recordFailure(this.account, ip));
    }
    return outcomes;
  }
}

describe('LoginLockout', () => {
  describe('when an origin keeps failing', () => {
    it('locks it on the fifth failure for fifteen minutes', async () => {
      const harness = new LockoutHarness();

      const outcomes = await harness.failFrom(
        IP,
        LockoutRules.origin.maxFailures,
      );

      expect(outcomes.map((outcome) => outcome.lockedForMs)).toEqual([
        undefined,
        undefined,
        undefined,
        undefined,
        LockoutRules.origin.baseLockMs,
      ]);
      await expect(
        harness.lockout.remainingLockMs(harness.account, IP),
      ).resolves.toBe(LockoutRules.origin.baseLockMs);
    });

    it('doubles the wait on the next lock of the same origin', async () => {
      const harness = new LockoutHarness();
      await harness.failFrom(IP, LockoutRules.origin.maxFailures);

      const outcomes = await harness.failFrom(
        IP,
        LockoutRules.origin.maxFailures,
      );

      expect(outcomes.at(-1)?.lockedForMs).toBe(
        2 * LockoutRules.origin.baseLockMs,
      );
    });

    it('forgets the failures of the origin after a successful sign-in', async () => {
      const harness = new LockoutHarness();
      await harness.failFrom(IP, LockoutRules.origin.maxFailures - 1);

      await harness.lockout.clear(harness.account, IP);
      const [next] = await harness.failFrom(IP, 1);

      expect(next?.lockedForMs).toBeUndefined();
    });
  });

  describe('when an account fails from many origins', () => {
    it('reports protected mode only on the failure that enables it', async () => {
      const harness = new LockoutHarness();
      const ips = Array.from(
        { length: LockoutRules.protectedMode.maxFailures + 1 },
        (_, index) => `198.51.100.${index + 1}`,
      );

      const outcomes = await Promise.all(
        ips.map((ip) => harness.lockout.recordFailure(harness.account, ip)),
      );

      expect(
        outcomes.filter((outcome) => outcome.protectedModeEnabled),
      ).toHaveLength(1);
      await expect(harness.lockout.isProtected(harness.account)).resolves.toBe(
        true,
      );
    });
  });

  describe('when an account is unlocked', () => {
    it('lifts the lock of its origins and its protected mode', async () => {
      const harness = new LockoutHarness();
      await harness.failFrom(IP, LockoutRules.origin.maxFailures);

      await harness.lockout.unlock(harness.account);

      await expect(
        harness.lockout.remainingLockMs(harness.account, IP),
      ).resolves.toBeUndefined();
      await expect(harness.lockout.isProtected(harness.account)).resolves.toBe(
        false,
      );
      const [next] = await harness.failFrom(IP, 1);
      expect(next?.lockedForMs).toBeUndefined();
    });

    it('keeps a lock written just before the epoch would expire until the lock ends', async () => {
      const harness = new LockoutHarness();
      await harness.lockout.unlock(harness.account);
      harness.clock.advance(LockoutRules.unlockEpochTtlMs - 5 * MINUTE_MS);
      await harness.failFrom(IP, LockoutRules.origin.maxFailures);

      harness.clock.advance(6 * MINUTE_MS);

      await expect(
        harness.lockout.remainingLockMs(harness.account, IP),
      ).resolves.toBeGreaterThan(0);
    });
  });
});

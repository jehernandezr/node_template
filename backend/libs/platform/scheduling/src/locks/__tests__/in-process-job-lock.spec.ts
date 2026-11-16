import type { JobLease } from '@platform/kernel';
import { FixedClock, FixedRandomSource } from '@platform/kernel/test-utils';
import { InProcessJobLock } from '../in-process-job-lock.js';

const TTL_MS = 1_000;

describe('InProcessJobLock', () => {
  let clock: FixedClock;
  let lock: InProcessJobLock;

  beforeEach(() => {
    clock = new FixedClock(new Date('2026-11-14T10:00:00.000Z'));
    lock = new InProcessJobLock(clock, new FixedRandomSource([0.5], 7));
  });

  describe('when a lease is held', () => {
    it('refuses a second acquire of the same name', async () => {
      await lock.tryAcquire('job', TTL_MS);
      await expect(lock.tryAcquire('job', TTL_MS)).resolves.toBeUndefined();
    });

    it('accepts an acquire again after release', async () => {
      const lease = await lock.tryAcquire('job', TTL_MS);
      await lock.release(lease as JobLease);
      await expect(lock.tryAcquire('job', TTL_MS)).resolves.toMatchObject({
        name: 'job',
      });
    });

    it('accepts an acquire once the ttl has passed', async () => {
      await lock.tryAcquire('job', TTL_MS);
      clock.advance(TTL_MS);
      await expect(lock.tryAcquire('job', TTL_MS)).resolves.toMatchObject({
        name: 'job',
      });
    });

    it('keeps the new owner when an expired lease releases', async () => {
      const stale = await lock.tryAcquire('job', TTL_MS);
      clock.advance(TTL_MS);
      await lock.tryAcquire('job', TTL_MS);
      await lock.release(stale as JobLease);
      await expect(lock.tryAcquire('job', TTL_MS)).resolves.toBeUndefined();
    });
  });

  describe('when the names differ', () => {
    it('does not block a different name', async () => {
      await lock.tryAcquire('job-a', TTL_MS);
      await expect(lock.tryAcquire('job-b', TTL_MS)).resolves.toMatchObject({
        name: 'job-b',
      });
    });
  });

  describe('when two leases are granted in a row', () => {
    it('gives each lease a different token', async () => {
      const first = await lock.tryAcquire('job-a', TTL_MS);
      const second = await lock.tryAcquire('job-b', TTL_MS);
      expect(first?.token).not.toBe(second?.token);
    });
  });
});

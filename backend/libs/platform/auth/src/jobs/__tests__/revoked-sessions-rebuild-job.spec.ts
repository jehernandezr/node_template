import { RevocationReason } from '@contracts/identity';
import { BloomFilter, InMemoryAsyncBloomFilter } from '@platform/bloom';
import { JobScheduleKind } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryAuthState } from '../../__tests__/utils/in-memory-auth-state.js';
import { RevokedSessionRegistry } from '../../state/revoked-session-registry.js';
import { AuthJob } from '../auth-job.enum.js';
import { RevokedSessionsRebuildJob } from '../revoked-sessions-rebuild-job.js';

const START = new Date('2026-01-15T12:00:00.000Z');

describe('RevokedSessionsRebuildJob', () => {
  let state: InMemoryAuthState;
  let clock: FixedClock;
  let registry: RevokedSessionRegistry;
  let job: RevokedSessionsRebuildJob;

  beforeEach(() => {
    state = new InMemoryAuthState();
    clock = new FixedClock(START);
    registry = new RevokedSessionRegistry(
      new InMemoryAsyncBloomFilter(BloomFilter.create({ expectedItems: 1000 })),
    );
    job = new RevokedSessionsRebuildJob(state, registry);
  });

  function context(runId: string) {
    return {
      signal: new AbortController().signal,
      startedAt: clock.now(),
      runId,
    };
  }

  describe('schedule', () => {
    it('is named after the auth job and runs every 10 seconds with jitter', () => {
      expect(job.name).toBe(AuthJob.RevokedSessionsRebuild);
      expect(job.schedule).toEqual({
        kind: JobScheduleKind.Interval,
        everyMs: 10_000,
        jitterRatio: 0.1,
      });
    });

    it('is not exclusive, so every process rebuilds its own filter', () => {
      expect(job.exclusive).toBe(false);
    });
  });

  describe('run', () => {
    it('leaves the registry warm and holding the revoked sessions', async () => {
      await state.revokeSession('session-1', 60_000, RevocationReason.Logout);
      await state.revokeSession('session-2', 60_000, RevocationReason.Logout);

      await job.run(context('run-1'));

      expect(registry.isWarm()).toBe(true);
      expect(await registry.mightContain('session-1')).toBe(true);
      expect(await registry.mightContain('session-2')).toBe(true);
    });

    it('rejects with the read failure and leaves the registry cold', async () => {
      const failure = new Error('down');
      state.failure = failure;

      await expect(job.run(context('run-2'))).rejects.toBe(failure);

      expect(registry.isWarm()).toBe(false);
    });
  });
});

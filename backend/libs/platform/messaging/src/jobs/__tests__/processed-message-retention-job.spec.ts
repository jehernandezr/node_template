import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { Deadline } from '@platform/primitives';
import { ClaimState, type ClaimRequest } from '@platform/kernel';
import { ProcessedMessageKey } from '../../dispatch/processed-message-key.js';
import {
  AcquiredClaim,
  InMemoryProcessedMessageStore,
} from '../../__tests__/utils/index.js';
import { ProcessedMessageRetentionJob } from '../processed-message-retention-job.js';
import { MessagingJob } from '../messaging-job.enum.js';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const RETENTION_MS = 1_000;

describe('ProcessedMessageRetentionJob', () => {
  function setup() {
    const clock = new FixedClock(T0);
    const store = new InMemoryProcessedMessageStore(
      clock,
      new SequentialIdGenerator(),
    );
    const request: ClaimRequest = {
      fingerprint: 'fp',
      deadline: Deadline.after(1_000, clock),
      minLeaseMs: 30_000,
    };
    return { clock, store, request };
  }

  it('has the retention job name', () => {
    const { clock, store } = setup();
    expect(
      new ProcessedMessageRetentionJob(store, clock, RETENTION_MS).name,
    ).toBe(MessagingJob.ProcessedMessageRetention);
  });

  it('deletes completed messages older than the retention and keeps the rest', async () => {
    const { clock, store, request } = setup();
    const oldKey = ProcessedMessageKey.of('audit', 'old');
    const recentKey = ProcessedMessageKey.of('audit', 'recent');
    const openKey = ProcessedMessageKey.of('audit', 'open');

    const old = AcquiredClaim.of(await store.claim(oldKey, request));
    const recent = AcquiredClaim.of(await store.claim(recentKey, request));
    await store.complete(oldKey, old.claimToken, {
      processedAt: T0.getTime() - 5_000,
    });
    await store.complete(recentKey, recent.claimToken, {
      processedAt: T0.getTime(),
    });
    await store.claim(openKey, request);

    await new ProcessedMessageRetentionJob(store, clock, RETENTION_MS).run();

    expect((await store.claim(recentKey, request)).state).toBe(
      ClaimState.Completed,
    );
    expect((await store.claim(openKey, request)).state).toBe(
      ClaimState.InProgress,
    );
    expect((await store.claim(oldKey, request)).state).toBe(
      ClaimState.Acquired,
    );
  });
});

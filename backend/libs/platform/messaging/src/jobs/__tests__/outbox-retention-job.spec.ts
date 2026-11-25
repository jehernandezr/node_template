import { FixedClock } from '@platform/kernel/test-utils';
import {
  EnvelopeBuilder,
  InMemoryOutboxStore,
} from '../../__tests__/utils/index.js';
import { OutboxStatus, type OutboxLease } from '../../outbox/outbox.js';
import { OutboxRetentionJob } from '../outbox-retention-job.js';
import { MessagingJob } from '../messaging-job.enum.js';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const OLD = new Date(T0.getTime() - 5_000);
const RETENTION_MS = 1_000;
const lease: OutboxLease = { owner: 'retention', token: 'retention-token' };

function envelope(id: string) {
  return EnvelopeBuilder.anEnvelope({ id, type: 't', source: 's', data: {} });
}

describe('OutboxRetentionJob', () => {
  it('has the retention job name', () => {
    const clock = new FixedClock(T0);
    const job = new OutboxRetentionJob(
      new InMemoryOutboxStore({ clock }),
      clock,
      RETENTION_MS,
    );
    expect(job.name).toBe(MessagingJob.OutboxRetention);
  });

  it('deletes published records older than the retention and keeps the rest', async () => {
    const clock = new FixedClock(OLD);
    const store = new InMemoryOutboxStore({ clock });
    store.add(envelope('old-published'), { now: OLD });
    store.add(envelope('recent-published'), { now: T0 });
    store.add(envelope('pending'), { now: T0 });
    store.add(envelope('dead'), { now: T0 });

    // The change instant of a terminal record is the clock time when it was marked.
    await store.claimPending({ now: OLD, limit: 1, lease, leaseMs: 1_000 });
    await store.markPublished('old-published', lease);

    clock.set(T0);
    await store.claimPending({ now: T0, limit: 10, lease, leaseMs: 1_000 });
    await store.markPublished('recent-published', lease);
    await store.markDead('dead', lease, 'no route');
    await store.releaseLease('pending', lease);

    await new OutboxRetentionJob(store, clock, RETENTION_MS).run();

    expect(store.get('old-published')).toBeUndefined();
    expect(store.get('recent-published')?.status).toBe(OutboxStatus.Published);
    expect(store.get('pending')?.status).toBe(OutboxStatus.Pending);
    expect(store.get('dead')?.status).toBe(OutboxStatus.Dead);
  });
});

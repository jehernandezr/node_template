import { createEnvelope } from '../envelope/message-envelope.js';
import { InMemoryOutboxStore } from './in-memory-outbox-store.js';
import { OutboxStatus } from './outbox.js';

describe('InMemoryOutboxStore', () => {
  const t0 = new Date('2026-01-01T00:00:00.000Z');
  const at = (ms: number) => new Date(t0.getTime() + ms);
  const make = (id: string) =>
    createEnvelope(
      { type: 't', source: 's', data: null },
      { newId: () => id, now: () => t0 },
    );

  it('claims only due records, oldest createdAt first, up to the limit', async () => {
    const store = new InMemoryOutboxStore();
    store.add(make('late'), { now: at(0) });
    store.add(make('future'), { now: at(0) });
    store.add(make('early'), { now: at(-2_000) });
    store.add(make('mid'), { now: at(-1_000) });
    // "future" is not due until 9 s, after a failure reschedules it.
    await store.markFailed('future', 'x', at(9_000));

    const claimed = await store.claimPending(at(0), 2, 'relay', 1_000);
    expect(claimed.map((r) => r.id)).toEqual(['early', 'mid']);
    expect(claimed.every((r) => r.leaseOwner === 'relay')).toBe(true);
  });

  it('does not hand a leased record to a second claimer until the lease expires', async () => {
    const store = new InMemoryOutboxStore();
    store.add(make('a'), { now: t0 });

    expect(
      (await store.claimPending(t0, 10, 'relay-1', 1_000)).map((r) => r.id),
    ).toEqual(['a']);
    expect(await store.claimPending(at(500), 10, 'relay-2', 1_000)).toEqual([]);
    expect(
      (await store.claimPending(at(1_000), 10, 'relay-2', 1_000)).map(
        (r) => r.id,
      ),
    ).toEqual(['a']);
  });

  it('never claims published or dead records', async () => {
    const store = new InMemoryOutboxStore();
    store.add(make('published'), { now: t0 });
    store.add(make('dead'), { now: t0 });
    await store.markPublished('published');
    await store.markDead('dead', 'no route');

    expect(store.get('published')?.status).toBe(OutboxStatus.Published);
    expect(store.get('dead')).toMatchObject({
      status: OutboxStatus.Dead,
      lastError: 'no route',
      attempts: 1,
    });
    expect(await store.claimPending(at(100_000), 10, 'relay', 1_000)).toEqual(
      [],
    );
  });

  it('records failures with the next attempt time and clears the lease', async () => {
    const store = new InMemoryOutboxStore();
    store.add(make('a'), { now: t0, groupId: 'order-7' });
    await store.claimPending(t0, 10, 'relay', 1_000);

    await store.markFailed('a', 'broker down', at(4_000));
    expect(store.get('a')).toMatchObject({
      status: OutboxStatus.Failed,
      attempts: 1,
      lastError: 'broker down',
      nextAttemptAt: at(4_000),
      groupId: 'order-7',
      leaseOwner: undefined,
    });
  });
});

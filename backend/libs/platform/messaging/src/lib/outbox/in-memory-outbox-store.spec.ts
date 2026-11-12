import { FixedClock } from '@platform/kernel/testing';
import { createEnvelope } from '../envelope/message-envelope.js';
import { InMemoryOutboxStore } from './in-memory-outbox-store.js';
import { type OutboxLease, OutboxStatus } from './outbox.js';

describe('InMemoryOutboxStore', () => {
  const t0 = new Date('2026-01-01T00:00:00.000Z');
  const at = (ms: number) => new Date(t0.getTime() + ms);
  const make = (id: string) =>
    createEnvelope(
      { type: 't', source: 's', data: null },
      { newId: () => id, now: () => t0 },
    );
  const lease = (owner: string, token = `${owner}-token`): OutboxLease => ({
    owner,
    token,
  });
  const claim = (
    store: InMemoryOutboxStore,
    now: Date,
    owner: OutboxLease,
    limit = 10,
    leaseMs = 1_000,
  ) => store.claimPending({ now, limit, lease: owner, leaseMs });

  it('claims only due records, oldest createdAt first, up to the limit', async () => {
    const store = new InMemoryOutboxStore();
    store.add(make('late'), { now: at(0) });
    store.add(make('future'), { now: at(0) });
    store.add(make('early'), { now: at(-2_000) });
    store.add(make('mid'), { now: at(-1_000) });
    // "future" is not due until 9 s, after a failure reschedules it.
    const setup = lease('setup');
    await claim(store, at(0), setup, 10);
    await store.markFailed('future', setup, 'x', at(9_000));
    for (const id of ['late', 'early', 'mid']) {
      await store.releaseLease(id, setup);
    }

    const relay = lease('relay');
    const claimed = await claim(store, at(0), relay, 2);
    expect(claimed.map((r) => r.id)).toEqual(['early', 'mid']);
    expect(
      claimed.every(
        (r) => r.leaseOwner === 'relay' && r.leaseToken === 'relay-token',
      ),
    ).toBe(true);
  });

  it('defaults the creation time to its clock', () => {
    const store = new InMemoryOutboxStore({ clock: new FixedClock(t0) });
    expect(store.add(make('a')).createdAt).toEqual(t0);
  });

  it('does not hand a leased record to a second claimer until the lease expires', async () => {
    const store = new InMemoryOutboxStore();
    store.add(make('a'), { now: t0 });

    expect((await claim(store, t0, lease('relay-1'))).map((r) => r.id)).toEqual(
      ['a'],
    );
    expect(await claim(store, at(500), lease('relay-2'))).toEqual([]);
    expect(
      (await claim(store, at(1_000), lease('relay-2'))).map((r) => r.id),
    ).toEqual(['a']);
  });

  it('only applies marks from the current lease owner and token', async () => {
    const store = new InMemoryOutboxStore();
    store.add(make('a'), { now: t0 });
    const first = lease('relay-1');
    await claim(store, t0, first);
    // The lease expires and another relay takes the record over.
    const second = lease('relay-2');
    await claim(store, at(1_000), second);

    expect(await store.markPublished('a', first)).toBe(false);
    expect(await store.markFailed('a', first, 'late', at(5_000))).toBe(false);
    expect(await store.markDead('a', first, 'late')).toBe(false);
    expect(await store.releaseLease('a', first)).toBe(false);
    // Same owner, older token (a previous pass of the same instance).
    expect(await store.markPublished('a', lease('relay-2', 'old-pass'))).toBe(
      false,
    );
    expect(store.get('a')).toMatchObject({
      status: OutboxStatus.Pending,
      attempts: 0,
      leaseOwner: 'relay-2',
    });

    expect(await store.markPublished('a', second)).toBe(true);
    expect(store.get('a')?.status).toBe(OutboxStatus.Published);
  });

  it('never claims published or dead records', async () => {
    const store = new InMemoryOutboxStore();
    store.add(make('published'), { now: t0 });
    store.add(make('dead'), { now: t0 });
    const relay = lease('relay');
    await claim(store, t0, relay);
    await store.markPublished('published', relay);
    await store.markDead('dead', relay, 'no route');

    expect(store.get('published')?.status).toBe(OutboxStatus.Published);
    expect(store.get('dead')).toMatchObject({
      status: OutboxStatus.Dead,
      lastError: 'no route',
      attempts: 1,
    });
    expect(await claim(store, at(100_000), relay)).toEqual([]);
  });

  it('records failures with the next attempt time and clears the lease', async () => {
    const store = new InMemoryOutboxStore();
    store.add(make('a'), { now: t0, groupId: 'order-7' });
    const relay = lease('relay');
    await claim(store, t0, relay);

    expect(await store.markFailed('a', relay, 'broker down', at(4_000))).toBe(
      true,
    );
    expect(store.get('a')).toMatchObject({
      status: OutboxStatus.Failed,
      attempts: 1,
      lastError: 'broker down',
      nextAttemptAt: at(4_000),
      groupId: 'order-7',
      leaseOwner: undefined,
      leaseToken: undefined,
    });
  });

  it('releases a lease without counting an attempt', async () => {
    const store = new InMemoryOutboxStore();
    store.add(make('a'), { now: t0 });
    const relay = lease('relay');
    await claim(store, t0, relay);
    expect(await store.releaseLease('a', relay)).toBe(true);
    expect(store.get('a')).toMatchObject({
      status: OutboxStatus.Pending,
      attempts: 0,
      leaseOwner: undefined,
    });
    expect((await claim(store, t0, lease('other'))).map((r) => r.id)).toEqual([
      'a',
    ]);
  });

  describe('FIFO per groupId', () => {
    it('does not hand out a record while an older one of its group is scheduled later', async () => {
      const store = new InMemoryOutboxStore();
      store.add(make('a1'), { now: at(0), groupId: 'order-1' });
      store.add(make('a2'), { now: at(1), groupId: 'order-1' });
      store.add(make('b1'), { now: at(2), groupId: 'order-2' });
      store.add(make('free'), { now: at(3) });
      const relay = lease('relay');
      await claim(store, at(10), relay);
      await store.markFailed('a1', relay, 'down', at(5_000));
      for (const id of ['a2', 'b1', 'free']) {
        await store.releaseLease(id, relay);
      }

      expect(
        (await claim(store, at(20), lease('next'))).map((r) => r.id),
      ).toEqual(['b1', 'free']);
      expect(
        (await claim(store, at(5_000), lease('later'), 2)).map((r) => r.id),
      ).toEqual(['a1', 'a2']);
    });

    it('does not hand out a record while an older one of its group is leased elsewhere', async () => {
      const store = new InMemoryOutboxStore();
      store.add(make('a1'), { now: at(0), groupId: 'order-1' });
      await claim(store, at(0), lease('relay-1'));
      store.add(make('a2'), { now: at(1), groupId: 'order-1' });

      expect(await claim(store, at(10), lease('relay-2'))).toEqual([]);
    });

    it('lets published and dead records unblock their group', async () => {
      const store = new InMemoryOutboxStore();
      store.add(make('a1'), { now: at(0), groupId: 'order-1' });
      store.add(make('a2'), { now: at(1), groupId: 'order-1' });
      store.add(make('a3'), { now: at(2), groupId: 'order-1' });
      const relay = lease('relay');
      expect((await claim(store, at(10), relay, 2)).map((r) => r.id)).toEqual([
        'a1',
        'a2',
      ]);
      await store.markPublished('a1', relay);
      await store.markDead('a2', relay, 'too large');

      expect(
        (await claim(store, at(10), lease('next'))).map((r) => r.id),
      ).toEqual(['a3']);
    });
  });
});

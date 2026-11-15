import { EnvelopeBuilder } from './envelope-builder.js';
import type { MessageEnvelope } from '../../envelope/message-envelope.js';
import {
  type OutboxLease,
  type OutboxRecord,
  OutboxStatus,
} from '../../outbox/outbox.js';
import type { OutboxStore } from '../../outbox/outbox-store.js';

/** Entorno de una corrida del contrato del outbox. */
export interface OutboxStoreContractEnv {
  readonly store: OutboxStore;
  /** Agrega un registro pendiente creado en `now`. */
  add(
    envelope: MessageEnvelope,
    options: { now: Date; groupId?: string; delayMs?: number },
  ): Promise<void>;
  get(id: string): Promise<OutboxRecord | undefined>;
}

const T0 = new Date('2026-01-01T00:00:00.000Z');
const FAR_PAST = new Date('2000-01-01T00:00:00.000Z');
const FAR_FUTURE = new Date('2999-01-01T00:00:00.000Z');
const at = (ms: number): Date => new Date(T0.getTime() + ms);
const make = (id: string): MessageEnvelope =>
  EnvelopeBuilder.anEnvelope({
    id,
    type: 't',
    source: 's',
    data: { n: 1 },
  });
const lease = (owner: string, token = `${owner}-token`): OutboxLease => ({
  owner,
  token,
});

/**
 * Contrato de `OutboxStore`: los casos que cumplen el adaptador en memoria y
 * el de Postgres. Cada adaptador lo llama desde su propio `describe`.
 */
export function runOutboxStoreContract(
  setup: () => Promise<OutboxStoreContractEnv>,
): void {
  let env: OutboxStoreContractEnv;
  const claim = (now: Date, owner: OutboxLease, limit = 10, leaseMs = 1_000) =>
    env.store.claimPending({ now, limit, lease: owner, leaseMs });
  const add = (
    id: string,
    now: Date,
    extra: { groupId?: string; delayMs?: number } = {},
  ) => env.add(make(id), { now, ...extra });

  beforeEach(async () => {
    env = await setup();
  });

  it('claims only due records, oldest createdAt first, up to the limit', async () => {
    await add('late', at(0));
    await add('future', at(0));
    await add('early', at(-2_000));
    await add('mid', at(-1_000));
    const setupLease = lease('setup');
    await claim(at(0), setupLease, 10);
    await env.store.markFailed('future', setupLease, 'x', at(9_000));
    for (const id of ['late', 'early', 'mid']) {
      await env.store.releaseLease(id, setupLease);
    }

    const claimed = await claim(at(0), lease('relay'), 2);
    expect(claimed.map((r) => r.id)).toEqual(['early', 'mid']);
    expect(
      claimed.every(
        (r) => r.leaseOwner === 'relay' && r.leaseToken === 'relay-token',
      ),
    ).toBe(true);
  });

  it('round-trips the envelope, group and delay', async () => {
    await add('a', at(0), { groupId: 'order-1', delayMs: 5_000 });
    const [record] = await claim(at(0), lease('relay'));
    expect(record).toMatchObject({
      id: 'a',
      status: OutboxStatus.Pending,
      attempts: 0,
      groupId: 'order-1',
      delayMs: 5_000,
      createdAt: at(0),
      nextAttemptAt: at(0),
      leaseExpiresAt: at(1_000),
    });
    expect(record?.envelope).toEqual(make('a'));
  });

  it('does not hand a leased record to a second claimer until the lease expires', async () => {
    await add('a', at(0));
    expect((await claim(at(0), lease('relay-1'))).map((r) => r.id)).toEqual([
      'a',
    ]);
    expect(await claim(at(500), lease('relay-2'))).toEqual([]);
    expect((await claim(at(1_000), lease('relay-2'))).map((r) => r.id)).toEqual(
      ['a'],
    );
  });

  it('only applies marks from the current lease owner and token', async () => {
    await add('a', at(0));
    const first = lease('relay-1');
    await claim(at(0), first);
    const second = lease('relay-2');
    await claim(at(1_000), second);

    expect(await env.store.markPublished('a', first)).toBe(false);
    expect(await env.store.markFailed('a', first, 'late', at(5_000))).toBe(
      false,
    );
    expect(await env.store.markDead('a', first, 'late')).toBe(false);
    expect(await env.store.releaseLease('a', first)).toBe(false);
    expect(
      await env.store.markPublished('a', lease('relay-2', 'old-pass')),
    ).toBe(false);
    expect(await env.get('a')).toMatchObject({
      status: OutboxStatus.Pending,
      attempts: 0,
      leaseOwner: 'relay-2',
    });

    expect(await env.store.markPublished('a', second)).toBe(true);
    expect((await env.get('a'))?.status).toBe(OutboxStatus.Published);
  });

  it('never claims published or dead records', async () => {
    await add('published', at(0));
    await add('dead', at(0));
    const relay = lease('relay');
    await claim(at(0), relay);
    await env.store.markPublished('published', relay);
    await env.store.markDead('dead', relay, 'no route');

    expect((await env.get('published'))?.status).toBe(OutboxStatus.Published);
    expect(await env.get('dead')).toMatchObject({
      status: OutboxStatus.Dead,
      lastError: 'no route',
      attempts: 1,
    });
    expect(await claim(at(100_000), relay)).toEqual([]);
  });

  it('records failures with the next attempt time and clears the lease', async () => {
    await add('a', at(0), { groupId: 'order-7' });
    const relay = lease('relay');
    await claim(at(0), relay);

    expect(
      await env.store.markFailed('a', relay, 'broker down', at(4_000)),
    ).toBe(true);
    const stored = await env.get('a');
    expect(stored).toMatchObject({
      status: OutboxStatus.Failed,
      attempts: 1,
      lastError: 'broker down',
      nextAttemptAt: at(4_000),
      groupId: 'order-7',
    });
    expect(stored?.leaseOwner).toBeUndefined();
    expect(stored?.leaseToken).toBeUndefined();
    expect(await claim(at(3_999), lease('next'))).toEqual([]);
    expect((await claim(at(4_000), lease('next'))).map((r) => r.id)).toEqual([
      'a',
    ]);
  });

  it('releases a lease without counting an attempt', async () => {
    await add('a', at(0));
    const relay = lease('relay');
    await claim(at(0), relay);
    expect(await env.store.releaseLease('a', relay)).toBe(true);
    expect(await env.get('a')).toMatchObject({
      status: OutboxStatus.Pending,
      attempts: 0,
    });
    expect((await claim(at(0), lease('other'))).map((r) => r.id)).toEqual([
      'a',
    ]);
  });

  it('purges only published records older than the cutoff, never pending or failed ones', async () => {
    await add('published', at(0));
    await add('pending', at(0));
    await add('failed', at(0));
    await add('dead', at(0));
    const relay = lease('relay');
    await claim(at(0), relay);
    await env.store.markPublished('published', relay);
    await env.store.markFailed('failed', relay, 'down', at(9_000));
    await env.store.markDead('dead', relay, 'no route');
    await env.store.releaseLease('pending', relay);

    expect(await env.store.purge({ before: FAR_PAST })).toBe(0);
    expect(await env.store.purge({ before: FAR_FUTURE })).toBe(1);
    expect(await env.get('published')).toBeUndefined();
    expect((await env.get('pending'))?.status).toBe(OutboxStatus.Pending);
    expect((await env.get('failed'))?.status).toBe(OutboxStatus.Failed);
    expect((await env.get('dead'))?.status).toBe(OutboxStatus.Dead);
  });

  it('purges dead records only when asked to include them', async () => {
    await add('dead', at(0));
    const relay = lease('relay');
    await claim(at(0), relay);
    await env.store.markDead('dead', relay, 'no route');

    expect(
      await env.store.purge({ before: FAR_FUTURE, includeDead: true }),
    ).toBe(1);
    expect(await env.get('dead')).toBeUndefined();
  });

  describe('FIFO per groupId', () => {
    it('does not hand out a record while an older one of its group is scheduled later', async () => {
      await add('a1', at(0), { groupId: 'order-1' });
      await add('a2', at(1), { groupId: 'order-1' });
      await add('b1', at(2), { groupId: 'order-2' });
      await add('free', at(3));
      const relay = lease('relay');
      await claim(at(10), relay);
      await env.store.markFailed('a1', relay, 'down', at(5_000));
      for (const id of ['a2', 'b1', 'free']) {
        await env.store.releaseLease(id, relay);
      }

      expect((await claim(at(20), lease('next'))).map((r) => r.id)).toEqual([
        'b1',
        'free',
      ]);
      expect(
        (await claim(at(5_000), lease('later'), 2)).map((r) => r.id),
      ).toEqual(['a1', 'a2']);
    });

    it('does not hand out a record while an older one of its group is leased elsewhere', async () => {
      await add('a1', at(0), { groupId: 'order-1' });
      await claim(at(0), lease('relay-1'));
      await add('a2', at(1), { groupId: 'order-1' });

      expect(await claim(at(10), lease('relay-2'))).toEqual([]);
    });

    it('lets published and dead records unblock their group', async () => {
      await add('a1', at(0), { groupId: 'order-1' });
      await add('a2', at(1), { groupId: 'order-1' });
      await add('a3', at(2), { groupId: 'order-1' });
      const relay = lease('relay');
      expect((await claim(at(10), relay, 2)).map((r) => r.id)).toEqual([
        'a1',
        'a2',
      ]);
      await env.store.markPublished('a1', relay);
      await env.store.markDead('a2', relay, 'too large');

      expect((await claim(at(10), lease('next'))).map((r) => r.id)).toEqual([
        'a3',
      ]);
    });
  });
}

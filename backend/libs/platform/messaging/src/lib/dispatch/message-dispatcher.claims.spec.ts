import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import { type ClaimRequest, ClaimState, Deadline } from '@platform/primitives';
import { z } from 'zod';
import { EventContract } from '../contracts/message-contract.js';
import { createEnvelope } from '../envelope/message-envelope.js';
import { MessagingErrorCode } from '../errors/messaging-error.js';
import { QueueDef } from '../topology/queue-def.js';
import { RetryPolicy } from '../topology/retry-policy.js';
import { Route } from '../topology/route.js';
import { TopicDef } from '../topology/topic-def.js';
import { Topology } from '../topology/topology.js';
import {
  DEFAULT_CLAIM_LEASE_MS,
  DispatchOutcome,
  MessageDispatcher,
  requiresRedelivery,
} from './message-dispatcher.js';
import {
  InMemoryProcessedMessageStore,
  processedMessageKey,
} from './processed-message-store.js';

class TaskUpdated extends EventContract<{ id: string }> {
  readonly type = 'tasks.task.updated.v1';
  readonly schema = z.object({ id: z.string().min(1) });
}

const policy = RetryPolicy.exponential({
  maxAttempts: 5,
  baseMs: 100,
  maxMs: 10_000,
  jitter: false,
});

function envelopeFor(data: unknown, id = 'msg-1'): unknown {
  return createEnvelope(
    { type: 'tasks.task.updated.v1', source: '/test', data },
    { newId: () => id },
  );
}

/** Lets pending promise callbacks run. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** A promise the test resolves by hand, to keep a handler running. */
function gate(): { promise: Promise<void>; open: () => void } {
  let open = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

function setup(minLeaseMs?: number) {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const store = new InMemoryProcessedMessageStore(
    clock,
    new SequentialIdGenerator(),
  );
  const dispatcher = new MessageDispatcher({
    consumer: 'notifications',
    processed: store,
    clock,
    ...(minLeaseMs === undefined ? {} : { minLeaseMs }),
  });
  return { clock, store, dispatcher };
}

describe('MessageDispatcher three-state claims', () => {
  it('leaves a redelivery for later while the first handler still runs, then reports a duplicate', async () => {
    const { dispatcher } = setup();
    const running = gate();
    const handler = jest.fn(() => running.promise);
    dispatcher.register(new TaskUpdated(), handler);
    const raw = envelopeFor({ id: 't1' });

    const first = dispatcher.dispatch(raw, {
      receiveCount: 1,
      retryPolicy: policy,
    });
    // Let the first delivery claim and enter the handler.
    await flush();

    const redelivery = await dispatcher.dispatch(raw, {
      receiveCount: 2,
      retryPolicy: policy,
    });
    expect(redelivery).toEqual({
      outcome: DispatchOutcome.InProgress,
      id: 'msg-1',
      delayMs: expect.any(Number),
    });
    expect(requiresRedelivery(redelivery)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);

    running.open();
    expect(await first).toEqual({
      outcome: DispatchOutcome.Processed,
      id: 'msg-1',
    });
    const later = await dispatcher.dispatch(raw, { receiveCount: 3 });
    expect(later).toEqual({ outcome: DispatchOutcome.Duplicate, id: 'msg-1' });
    expect(requiresRedelivery(later)).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('never dead-letters an in-progress redelivery, even past maxAttempts', async () => {
    const { dispatcher } = setup();
    dispatcher.register(new TaskUpdated(), () => gate().promise);
    const raw = envelopeFor({ id: 't1' });
    void dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy });
    await flush();

    expect(
      await dispatcher.dispatch(raw, { receiveCount: 99, retryPolicy: policy }),
    ).toMatchObject({ outcome: DispatchOutcome.InProgress });
  });

  it('dead-letters a delivery whose claim is held with different content', async () => {
    const { dispatcher, store, clock } = setup();
    dispatcher.register(new TaskUpdated(), jest.fn());
    await store.claim(processedMessageKey('notifications', 'msg-1'), {
      fingerprint: 'other-delivery',
      deadline: Deadline.after(60_000, clock),
    });
    expect(
      await dispatcher.dispatch(envelopeFor({ id: 't1' }), {
        receiveCount: 1,
        retryPolicy: policy,
      }),
    ).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.IdempotencyConflict,
    });
  });

  it('asks for a lease of at least the visibility timeout', async () => {
    const topic = new TopicDef('events');
    const queue = new QueueDef('notifications')
      .subscribesTo(topic)
      .visibilityTimeout(120)
      .deadLetter({ maxReceiveCount: 5 });
    class WithQueue extends Topology {
      readonly topics = [topic];
      readonly queues = [queue];
      readonly routes = [Route.event('tasks.task.updated.v1').to(topic)];
    }
    const clock = new FixedClock();
    const store = new InMemoryProcessedMessageStore(
      clock,
      new SequentialIdGenerator(),
    );
    const claim = jest.spyOn(store, 'claim');
    const dispatcher = new MessageDispatcher({
      consumer: 'notifications',
      processed: store,
      topology: new WithQueue(),
      clock,
    });
    dispatcher.register(new TaskUpdated(), () => undefined);

    await dispatcher.dispatch(envelopeFor({ id: 't1' }, 'a'), {
      receiveCount: 1,
    });
    const fromTopology = claim.mock.calls[0]?.[1] as ClaimRequest;
    expect(fromTopology.minLeaseMs).toBe(120_000);

    // The transport can report a longer, extended visibility timeout.
    await dispatcher.dispatch(envelopeFor({ id: 't1' }, 'b'), {
      receiveCount: 1,
      visibilityTimeoutMs: 600_000,
    });
    const extended = claim.mock.calls[1]?.[1] as ClaimRequest;
    expect(extended.minLeaseMs).toBe(600_000);
    expect(extended.deadline.atMs).toBeGreaterThanOrEqual(
      clock.now().getTime() + 600_000,
    );
  });

  it('defaults the lease to the SQS default visibility timeout and rejects invalid leases', async () => {
    const { dispatcher, store } = setup();
    const claim = jest.spyOn(store, 'claim');
    dispatcher.register(new TaskUpdated(), () => undefined);
    await dispatcher.dispatch(envelopeFor({ id: 't1' }), { receiveCount: 1 });
    expect((claim.mock.calls[0]?.[1] as ClaimRequest).minLeaseMs).toBe(
      DEFAULT_CLAIM_LEASE_MS,
    );

    expect(
      () =>
        new MessageDispatcher({
          consumer: 'x',
          processed: store,
          minLeaseMs: 0,
        }),
    ).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidOptions }),
    );
  });

  it('takes over a claim whose lease expired (the first consumer crashed)', async () => {
    const { dispatcher, store, clock } = setup(30_000);
    const handler = jest.fn();
    dispatcher.register(new TaskUpdated(), handler);
    const raw = envelopeFor({ id: 't1' });

    // A consumer claimed with the same content and died without completing.
    const crashed = jest.fn(() => new Promise<void>(() => undefined));
    const other = new MessageDispatcher({
      consumer: 'notifications',
      processed: store,
      clock,
      minLeaseMs: 30_000,
    }).register(new TaskUpdated(), crashed);
    void other.dispatch(raw, { receiveCount: 1 });
    await flush();

    expect((await dispatcher.dispatch(raw, { receiveCount: 2 })).outcome).toBe(
      DispatchOutcome.InProgress,
    );

    clock.advance(60_000);
    expect(await dispatcher.dispatch(raw, { receiveCount: 3 })).toEqual({
      outcome: DispatchOutcome.Processed,
      id: 'msg-1',
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('completes with the claim token: a handler that outlived its lease cannot complete', async () => {
    const { dispatcher, clock } = setup(1_000);
    const slow = gate();
    let calls = 0;
    dispatcher.register(new TaskUpdated(), async () => {
      calls++;
      if (calls === 1) await slow.promise;
    });
    const raw = envelopeFor({ id: 't1' });

    const first = dispatcher.dispatch(raw, {
      receiveCount: 1,
      retryPolicy: policy,
    });
    await flush();

    // The lease ends; a redelivery takes over and finishes first.
    clock.advance(10_000);
    expect(
      (await dispatcher.dispatch(raw, { receiveCount: 2, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.Processed);

    slow.open();
    // The stale completion is rejected and reported for redelivery,
    // which then sees the completed claim.
    expect(await first).toMatchObject({
      outcome: DispatchOutcome.RetryLater,
      code: 'PLATFORM.PRIMITIVES.STALE_CLAIM',
    });
    expect(
      (await dispatcher.dispatch(raw, { receiveCount: 3, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.Duplicate);
  });

  it('releases the claim with its token when the handler fails', async () => {
    const { dispatcher, store, clock } = setup();
    const release = jest.spyOn(store, 'release');
    dispatcher.register(new TaskUpdated(), () => {
      throw Object.assign(new Error('busy'), { retryable: true });
    });
    await dispatcher.dispatch(envelopeFor({ id: 't1' }), {
      receiveCount: 1,
      retryPolicy: policy,
    });
    expect(release).toHaveBeenCalledWith(
      processedMessageKey('notifications', 'msg-1'),
      expect.any(String),
    );
    const claim = await store.claim(
      processedMessageKey('notifications', 'msg-1'),
      { fingerprint: 'probe', deadline: Deadline.after(1_000, clock) },
    );
    expect(claim.state).toBe(ClaimState.Acquired);
  });

  it('dead-letters a message id reused with different content', async () => {
    const { dispatcher } = setup();
    const handler = jest.fn();
    dispatcher.register(new TaskUpdated(), handler);

    await dispatcher.dispatch(envelopeFor({ id: 't1' }), { receiveCount: 1 });
    expect(
      await dispatcher.dispatch(envelopeFor({ id: 't2' }), { receiveCount: 1 }),
    ).toEqual({
      outcome: DispatchOutcome.DeadLetter,
      id: 'msg-1',
      error: 'message id was already used with different content',
      code: MessagingErrorCode.IdempotencyConflict,
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('retries when completing the claim fails', async () => {
    const { dispatcher, store } = setup();
    jest
      .spyOn(store, 'complete')
      .mockRejectedValueOnce(new Error('connection reset'));
    const release = jest.spyOn(store, 'release');
    const handler = jest.fn();
    dispatcher.register(new TaskUpdated(), handler);
    const raw = envelopeFor({ id: 't1' });

    expect(
      await dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy }),
    ).toMatchObject({ outcome: DispatchOutcome.RetryLater });
    expect(release).toHaveBeenCalledTimes(1);
    expect(
      (await dispatcher.dispatch(raw, { receiveCount: 2, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.Processed);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

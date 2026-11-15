import { defineEvent } from '@contracts/platform';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  ClaimState,
  Deadline,
  BackoffStrategy,
  RetryPolicy,
} from '@platform/primitives';
import { z } from 'zod';
import { QueueDef } from '../../topology/queue-def.js';
import { Route } from '../../topology/route.js';
import { TopicDef } from '../../topology/topic-def.js';
import { Topology } from '../../topology/topology.js';
import { ClaimGuard } from '../claim-guard.js';
import { MessageDispatcher } from '../message-dispatcher.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { EnvelopeBuilder } from '../../__tests__/utils/index.js';
import { DispatchOutcome } from '../dispatch-outcome.enum.js';
import { DispatchResults } from '../dispatch-results.js';
import { ProcessedMessageKey } from '../processed-message-key.js';
import {
  FailingProcessedMessageStore,
  RecordingMessageHandler,
  RecordingProcessedMessageStore,
  StoreOperation,
} from './utils/index.js';

const TaskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: z.object({ id: z.string().min(1) }),
  description: 'Mensaje de prueba.',
});

const policy = new RetryPolicy(5, 100, 10_000, BackoffStrategy.None);
const KEY = ProcessedMessageKey.of('notifications', 'msg-1');

function envelopeFor(data: unknown, id = 'msg-1'): unknown {
  return EnvelopeBuilder.anEnvelope({
    id,
    type: 'tasks.task.updated.v1',
    data,
  });
}

/** Deja correr las callbacks de promesas pendientes. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Promesa que nunca se resuelve: un manejador que se queda corriendo. */
const neverSettles = () => new Promise<void>(() => undefined);

/** Promesa que el test resuelve a mano, para mantener un manejador en curso. */
function gate(): { promise: Promise<void>; open: () => void } {
  let open = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

function setup(minLeaseMs?: number) {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const store = new RecordingProcessedMessageStore(
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
    const handler = new RecordingMessageHandler({ gates: [running.promise] });
    dispatcher.register(TaskUpdated, handler.handle);
    const raw = envelopeFor({ id: 't1' });

    const first = dispatcher.dispatch(raw, {
      receiveCount: 1,
      retryPolicy: policy,
    });
    // Deja que la primera entrega tome el claim y entre al manejador.
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
    expect(DispatchResults.requiresRedelivery(redelivery)).toBe(true);
    expect(handler.calls).toHaveLength(1);

    running.open();
    expect(await first).toEqual({
      outcome: DispatchOutcome.Processed,
      id: 'msg-1',
    });
    const later = await dispatcher.dispatch(raw, { receiveCount: 3 });
    expect(later).toEqual({ outcome: DispatchOutcome.Duplicate, id: 'msg-1' });
    expect(DispatchResults.requiresRedelivery(later)).toBe(false);
    expect(handler.calls).toHaveLength(1);
  });

  it('never dead-letters an in-progress redelivery, even past maxAttempts', async () => {
    const { dispatcher } = setup();
    dispatcher.register(
      TaskUpdated,
      new RecordingMessageHandler({ gates: [neverSettles()] }).handle,
    );
    const raw = envelopeFor({ id: 't1' });
    void dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy });
    await flush();

    expect(
      await dispatcher.dispatch(raw, { receiveCount: 99, retryPolicy: policy }),
    ).toMatchObject({ outcome: DispatchOutcome.InProgress });
  });

  it('dead-letters a delivery whose claim is held with different content', async () => {
    const { dispatcher, store, clock } = setup();
    dispatcher.register(TaskUpdated, new RecordingMessageHandler().handle);
    await store.claim(KEY, {
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

  it('asks for a lease of at least the visibility timeout of the queue, and of the delivery when it is longer', async () => {
    const topic = new TopicDef('events');
    const queue = new QueueDef('notifications')
      .subscribesTo(topic)
      .visibilityTimeout(120)
      .deadLetter({ maxReceiveCount: 5 });
    const topology = new Topology({
      topics: [topic],
      queues: [queue],
      routes: [Route.event(TaskUpdated).to(topic)],
    });
    const clock = new FixedClock();
    const store = new RecordingProcessedMessageStore(
      clock,
      new SequentialIdGenerator(),
    );
    const dispatcher = new MessageDispatcher({
      consumer: 'notifications',
      processed: store,
      topology,
      clock,
    });
    dispatcher.register(TaskUpdated, new RecordingMessageHandler().handle);

    await dispatcher.dispatch(envelopeFor({ id: 't1' }), { receiveCount: 1 });
    expect(store.claims[0]).toMatchObject({ minLeaseMs: 120_000 });

    // La entrega reporta un visibility timeout extendido más largo.
    await dispatcher.dispatch(envelopeFor({ id: 't1' }), {
      receiveCount: 1,
      visibilityTimeoutMs: 600_000,
    });
    expect(store.claims[1]).toMatchObject({ minLeaseMs: 600_000 });
    expect(store.claims[1]?.deadline.atMs).toBeGreaterThanOrEqual(
      clock.now().getTime() + 600_000,
    );
  });

  it('defaults the lease to the SQS default visibility timeout and rejects invalid leases', async () => {
    const { dispatcher, store } = setup();
    dispatcher.register(TaskUpdated, new RecordingMessageHandler().handle);
    await dispatcher.dispatch(envelopeFor({ id: 't1' }), { receiveCount: 1 });
    expect(store.claims[0]).toMatchObject({
      minLeaseMs: ClaimGuard.DEFAULT_LEASE_MS,
    });

    expect(
      () =>
        new MessageDispatcher({
          consumer: 'x',
          processed: store,
          minLeaseMs: 0,
        }),
    ).toThrow(
      expect.objectContaining({
        code: MessagingErrorCode.InvalidOptions,
      }),
    );
  });

  it('takes over a claim whose lease expired (the first consumer crashed)', async () => {
    const { dispatcher, store, clock } = setup(30_000);
    const handler = new RecordingMessageHandler();
    dispatcher.register(TaskUpdated, handler.handle);
    const raw = envelopeFor({ id: 't1' });

    // Un consumidor tomó el claim con el mismo contenido y murió sin completarlo.
    const crashed = new MessageDispatcher({
      consumer: 'notifications',
      processed: store,
      clock,
      minLeaseMs: 30_000,
    }).register(
      TaskUpdated,
      new RecordingMessageHandler({ gates: [neverSettles()] }).handle,
    );
    void crashed.dispatch(raw, { receiveCount: 1 });
    await flush();

    expect((await dispatcher.dispatch(raw, { receiveCount: 2 })).outcome).toBe(
      DispatchOutcome.InProgress,
    );

    clock.advance(60_000);
    expect(await dispatcher.dispatch(raw, { receiveCount: 3 })).toEqual({
      outcome: DispatchOutcome.Processed,
      id: 'msg-1',
    });
    expect(handler.calls).toHaveLength(1);
  });

  it('completes with the claim token: a handler that outlived its lease cannot complete', async () => {
    const { dispatcher, clock } = setup(1_000);
    const slow = gate();
    // La primera llamada espera a `slow`; la segunda termina de inmediato.
    dispatcher.register(
      TaskUpdated,
      new RecordingMessageHandler({ gates: [slow.promise] }).handle,
    );
    const raw = envelopeFor({ id: 't1' });

    const first = dispatcher.dispatch(raw, {
      receiveCount: 1,
      retryPolicy: policy,
    });
    await flush();

    // Vence el lease; una reentrega toma el claim y termina primero.
    clock.advance(10_000);
    expect(
      (await dispatcher.dispatch(raw, { receiveCount: 2, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.Processed);

    slow.open();
    // La completión vencida se rechaza y se informa para reentrega, que
    // entonces ve el claim completado.
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
    dispatcher.register(
      TaskUpdated,
      new RecordingMessageHandler({
        error: Object.assign(new Error('busy'), { retryable: true }),
      }).handle,
    );
    await dispatcher.dispatch(envelopeFor({ id: 't1' }), {
      receiveCount: 1,
      retryPolicy: policy,
    });

    expect(store.releases).toBe(1);
    expect(
      await store.claim(KEY, {
        fingerprint: 'probe',
        deadline: Deadline.after(1_000, clock),
      }),
    ).toMatchObject({ state: ClaimState.Acquired });
  });

  it('dead-letters a message id reused with different content', async () => {
    const { dispatcher } = setup();
    const handler = new RecordingMessageHandler();
    dispatcher.register(TaskUpdated, handler.handle);

    await dispatcher.dispatch(envelopeFor({ id: 't1' }), { receiveCount: 1 });
    expect(
      await dispatcher.dispatch(envelopeFor({ id: 't2' }), { receiveCount: 1 }),
    ).toEqual({
      outcome: DispatchOutcome.DeadLetter,
      id: 'msg-1',
      error: 'message id was already used with different content',
      code: MessagingErrorCode.IdempotencyConflict,
    });
    expect(handler.calls).toHaveLength(1);
  });

  it('retries when completing the claim fails, then processes the redelivery', async () => {
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const dispatcher = new MessageDispatcher({
      consumer: 'notifications',
      processed: new FailingProcessedMessageStore(
        StoreOperation.Complete,
        new Error('connection reset'),
        1,
        clock,
      ),
      clock,
    });
    const handler = new RecordingMessageHandler();
    dispatcher.register(TaskUpdated, handler.handle);
    const raw = envelopeFor({ id: 't1' });

    expect(
      await dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy }),
    ).toMatchObject({ outcome: DispatchOutcome.RetryLater });
    expect(
      (await dispatcher.dispatch(raw, { receiveCount: 2, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.Processed);
    expect(handler.calls).toHaveLength(2);
  });
});

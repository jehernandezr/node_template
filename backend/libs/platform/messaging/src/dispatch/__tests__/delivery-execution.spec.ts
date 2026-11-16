import {
  FixedClock,
  FixedRandomSource,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import {
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import {
  BackoffStrategy,
  Deadline,
  FailureClassifier,
  RetryPolicy,
} from '@platform/primitives';
import { ClaimState } from '@platform/kernel';
import { EnvelopeBuilder } from '../../__tests__/utils/index.js';
import { MessagingGuard } from '../../errors/messaging-guard.js';
import { PermanentMessageError } from '../../errors/permanent-message.error.js';
import { ClaimGuard } from '../claim-guard.js';
import { DeliveryClassifier } from '../delivery-classifier.js';
import { DeliveryExecution } from '../delivery-execution.js';
import { DispatchOutcome } from '../dispatch-outcome.enum.js';
import type { DispatchOptions } from '../dispatch-options.js';
import type { PreparedDelivery } from '../handler-registry.js';
import type { ProcessedMessageStore } from '../processed-message-store.js';
import { ProcessedMessageKey } from '../processed-message-key.js';
import {
  FailingProcessedMessageStore,
  RecordingMessageHandler,
  RecordingProcessedMessageStore,
  RecordingRunInContext,
  StoreOperation,
} from './utils/index.js';

const CONSUMER = 'notifications';
const KEY = ProcessedMessageKey.of(CONSUMER, 'msg-1');
const policy = new RetryPolicy(5, 100, 10_000, BackoffStrategy.None);
const options: DispatchOptions = { receiveCount: 1, retryPolicy: policy };

function transient(message: string): Error {
  return Object.assign(new Error(message), { retryable: true });
}

/** Arma la ejecución sobre un almacén que recibe el mismo reloj que el claim. */
function setup<S extends ProcessedMessageStore>(
  makeStore: (clock: FixedClock) => S,
  runInContext?: RecordingRunInContext,
) {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const store: S = makeStore(clock);
  const claimGuard = new ClaimGuard(store, clock, MessagingGuard.instance, {
    baseLeaseMs: 30_000,
  });
  const tracing = new Tracing(new Redactor());
  const execution = new DeliveryExecution(
    claimGuard,
    new DeliveryClassifier(
      new FailureClassifier(),
      new FixedRandomSource([0.5]),
    ),
    tracing,
    new TraceContextRestorer(tracing),
    runInContext?.run,
    CONSUMER,
  );
  return { clock, store, execution };
}

function recording(clock: FixedClock): RecordingProcessedMessageStore {
  return new RecordingProcessedMessageStore(clock, new SequentialIdGenerator());
}

function deliveryFor(handler: RecordingMessageHandler): {
  envelope: ReturnType<typeof EnvelopeBuilder.anEnvelope>;
  delivery: PreparedDelivery;
} {
  const envelope = EnvelopeBuilder.anEnvelope({
    id: 'msg-1',
    type: 'tasks.task.updated.v1',
    data: { id: 't1' },
  });
  return {
    envelope,
    delivery: { envelope, run: () => handler.handle({ id: 't1' }, envelope) },
  };
}

describe('DeliveryExecution', () => {
  it('processes the delivery and completes the claim', async () => {
    const { execution, store, clock } = setup(recording);
    const handler = new RecordingMessageHandler();
    const { envelope, delivery } = deliveryFor(handler);

    expect(await execution.execute(envelope, delivery, 'fp', options)).toEqual({
      outcome: DispatchOutcome.Processed,
      id: 'msg-1',
    });
    expect(handler.calls).toHaveLength(1);
    expect(
      await store.claim(KEY, {
        fingerprint: 'probe',
        deadline: Deadline.after(1_000, clock),
      }),
    ).toMatchObject({ state: ClaimState.Completed });
  });

  it('releases the claim and classifies a handler failure', async () => {
    const { execution, store } = setup(recording);
    const { envelope, delivery } = deliveryFor(
      new RecordingMessageHandler({ error: transient('busy') }),
    );

    expect(await execution.execute(envelope, delivery, 'fp', options)).toEqual({
      outcome: DispatchOutcome.RetryLater,
      id: 'msg-1',
      delayMs: 100,
      error: 'busy',
    });
    expect(store.releases).toBe(1);
  });

  it('dead-letters a permanent handler failure and releases the claim', async () => {
    const { execution, store } = setup(recording);
    const { envelope, delivery } = deliveryFor(
      new RecordingMessageHandler({
        error: new PermanentMessageError('task no longer exists'),
      }),
    );

    expect(
      (await execution.execute(envelope, delivery, 'fp', options)).outcome,
    ).toBe(DispatchOutcome.DeadLetter);
    expect(store.releases).toBe(1);
  });

  it('retries and releases the claim when completing it fails', async () => {
    const { execution, store, clock } = setup(
      (c) =>
        new FailingProcessedMessageStore(
          StoreOperation.Complete,
          new Error('connection reset'),
          1,
          c,
        ),
    );
    const handler = new RecordingMessageHandler();
    const { envelope, delivery } = deliveryFor(handler);

    expect(
      await execution.execute(envelope, delivery, 'fp', options),
    ).toMatchObject({
      outcome: DispatchOutcome.RetryLater,
      error: 'connection reset',
    });
    expect(handler.calls).toHaveLength(1);
    expect(
      await store.claim(KEY, {
        fingerprint: 'probe',
        deadline: Deadline.after(1_000, clock),
      }),
    ).toMatchObject({ state: ClaimState.Acquired });
  });

  it('retries without running the handler when the claim fails', async () => {
    const { execution } = setup(
      (c) =>
        new FailingProcessedMessageStore(
          StoreOperation.Claim,
          new Error('connection reset'),
          Number.POSITIVE_INFINITY,
          c,
        ),
    );
    const handler = new RecordingMessageHandler();
    const { envelope, delivery } = deliveryFor(handler);

    expect(
      await execution.execute(envelope, delivery, 'fp', options),
    ).toMatchObject({
      outcome: DispatchOutcome.RetryLater,
      error: 'connection reset',
    });
    expect(handler.calls).toEqual([]);
  });

  it('reports the settled outcome of the claim without running the handler', async () => {
    const { execution, store, clock } = setup(recording);
    const acquired = await store.claim(KEY, {
      fingerprint: 'fp',
      deadline: Deadline.after(1_000, clock),
    });
    await store.complete(KEY, (acquired as { claimToken: string }).claimToken, {
      processedAt: clock.now().getTime(),
    });
    const handler = new RecordingMessageHandler();
    const { envelope, delivery } = deliveryFor(handler);

    expect(await execution.execute(envelope, delivery, 'fp', options)).toEqual({
      outcome: DispatchOutcome.Duplicate,
      id: 'msg-1',
    });
    expect(handler.calls).toEqual([]);
  });

  it('runs the claim and the handler inside the context', async () => {
    const runInContext = new RecordingRunInContext();
    const { execution, store } = setup(recording, runInContext);
    const handler = new RecordingMessageHandler();
    const { envelope, delivery } = deliveryFor(handler);

    await execution.execute(envelope, delivery, 'fp', options);

    expect(runInContext.events).toEqual([`enter:${envelope.type}`, 'exit']);
    expect(handler.calls).toHaveLength(1);
    expect(store.claims).toHaveLength(1);
  });
});

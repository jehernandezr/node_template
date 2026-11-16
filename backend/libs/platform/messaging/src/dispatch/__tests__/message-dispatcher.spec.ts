import { defineCommand, defineEvent } from '@contracts/platform';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { z, ZodError } from 'zod';
import { QueueDef } from '../../topology/queue-def.js';
import { Route } from '../../topology/route.js';
import { TopicDef } from '../../topology/topic-def.js';
import { Topology } from '../../topology/topology.js';
import { PermanentMessageError } from '../../errors/permanent-message.error.js';
import { MessageDispatcher } from '../message-dispatcher.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { DispatchOutcome } from '../dispatch-outcome.enum.js';
import { EnvelopeBuilder } from '../../__tests__/utils/index.js';
import {
  FailingProcessedMessageStore,
  RecordingMessageHandler,
  StoreOperation,
} from './utils/index.js';
import { InMemoryProcessedMessageStore } from '../../__tests__/utils/in-memory-processed-message-store.js';

const TaskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: z.object({ id: z.string().min(1) }),
  description: 'Mensaje de prueba.',
});

const GenerateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: z.object({ reportId: z.string() }),
  description: 'Mensaje de prueba.',
});

const policy = new RetryPolicy(3, 100, 10_000, BackoffStrategy.None);

/** Error que el clasificador de la plataforma trata como transitorio. */
function transient(message: string): Error {
  return Object.assign(new Error(message), { retryable: true });
}

function envelopeFor(type: string, data: unknown, id = 'msg-1'): unknown {
  return EnvelopeBuilder.anEnvelope({ id, type, data });
}

function setup(
  extra: Partial<ConstructorParameters<typeof MessageDispatcher>[0]> = {},
) {
  const processed = new InMemoryProcessedMessageStore();
  const dispatcher = new MessageDispatcher({
    consumer: 'notifications',
    processed,
    ...extra,
  });
  return { processed, dispatcher };
}

describe('MessageDispatcher', () => {
  it('processes a valid delivery once and reports duplicates afterwards', async () => {
    const { dispatcher } = setup();
    const handler = new RecordingMessageHandler();
    dispatcher.register(TaskUpdated, handler.handle);

    const raw = envelopeFor('tasks.task.updated.v1', { id: 't1' });
    expect(await dispatcher.dispatch(raw, { receiveCount: 1 })).toEqual({
      outcome: DispatchOutcome.Processed,
      id: 'msg-1',
    });
    expect(await dispatcher.dispatch(raw, { receiveCount: 2 })).toEqual({
      outcome: DispatchOutcome.Duplicate,
      id: 'msg-1',
    });
    expect(handler.calls).toHaveLength(1);
    expect(handler.calls[0]?.data).toEqual({ id: 't1' });
  });

  it('asks for a retry with backoff delay while attempts remain', async () => {
    const { dispatcher } = setup();
    dispatcher.register(
      TaskUpdated,
      new RecordingMessageHandler({
        error: transient('database unavailable'),
      }).handle,
    );
    const raw = envelopeFor('tasks.task.updated.v1', { id: 't1' });

    expect(
      await dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy }),
    ).toEqual({
      outcome: DispatchOutcome.RetryLater,
      id: 'msg-1',
      delayMs: 100,
      error: 'database unavailable',
    });
    expect(
      await dispatcher.dispatch(raw, { receiveCount: 2, retryPolicy: policy }),
    ).toMatchObject({
      outcome: DispatchOutcome.RetryLater,
      delayMs: 200,
    });
  });

  it('releases the claim on failure so the redelivery is processed', async () => {
    const processed = new InMemoryProcessedMessageStore();
    const raw = envelopeFor('tasks.task.updated.v1', { id: 't1' });
    const failing = new MessageDispatcher({
      consumer: 'notifications',
      processed,
    }).register(
      TaskUpdated,
      new RecordingMessageHandler({ error: transient('transient') }).handle,
    );
    const handler = new RecordingMessageHandler();
    const recovering = new MessageDispatcher({
      consumer: 'notifications',
      processed,
    }).register(TaskUpdated, handler.handle);

    expect(
      (await failing.dispatch(raw, { receiveCount: 1, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.RetryLater);
    expect(
      await recovering.dispatch(raw, { receiveCount: 2, retryPolicy: policy }),
    ).toEqual({ outcome: DispatchOutcome.Processed, id: 'msg-1' });
    expect(handler.calls).toHaveLength(1);
  });

  it('dead-letters once the max attempts are reached', async () => {
    const { dispatcher } = setup();
    dispatcher.register(
      TaskUpdated,
      new RecordingMessageHandler({ error: new Error('still failing') }).handle,
    );
    const raw = envelopeFor('tasks.task.updated.v1', { id: 't1' });

    expect(
      await dispatcher.dispatch(raw, { receiveCount: 3, retryPolicy: policy }),
    ).toEqual({
      outcome: DispatchOutcome.DeadLetter,
      id: 'msg-1',
      error: 'still failing',
    });
  });

  it('dead-letters immediately without a retry policy', async () => {
    const { dispatcher } = setup();
    dispatcher.register(
      TaskUpdated,
      new RecordingMessageHandler({ error: new Error('boom') }).handle,
    );
    const result = await dispatcher.dispatch(
      envelopeFor('tasks.task.updated.v1', { id: 't1' }),
      { receiveCount: 1 },
    );
    expect(result.outcome).toBe(DispatchOutcome.DeadLetter);
  });

  it('dead-letters PermanentMessageError without retrying', async () => {
    const { dispatcher } = setup();
    dispatcher.register(
      TaskUpdated,
      new RecordingMessageHandler({
        error: new PermanentMessageError('task no longer exists'),
      }).handle,
    );
    expect(
      await dispatcher.dispatch(
        envelopeFor('tasks.task.updated.v1', { id: 't1' }),
        { receiveCount: 1, retryPolicy: policy },
      ),
    ).toEqual({
      outcome: DispatchOutcome.DeadLetter,
      id: 'msg-1',
      error: 'task no longer exists',
      code: MessagingErrorCode.PermanentError,
    });
  });

  it.each([
    [
      'a domain error marked not retryable',
      Object.assign(new Error('insufficient stock'), {
        code: 'INVENTORY.STOCK.EMPTY',
        retryable: false,
      }),
      DispatchOutcome.DeadLetter,
    ],
    [
      'a domain error without any signal',
      Object.assign(new Error('insufficient stock'), {
        code: 'INVENTORY.STOCK.EMPTY',
      }),
      DispatchOutcome.DeadLetter,
    ],
    [
      'a domain error marked retryable',
      Object.assign(new Error('insufficient stock'), {
        code: 'INVENTORY.STOCK.EMPTY',
        retryable: true,
      }),
      DispatchOutcome.RetryLater,
    ],
    [
      'a timeout, whose result is uncertain',
      Object.assign(new Error('slow'), { name: 'TimeoutError' }),
      DispatchOutcome.RetryLater,
    ],
    [
      'an error without any signal',
      new Error('unclassified'),
      DispatchOutcome.DeadLetter,
    ],
  ])(
    'classifies a handler failure as %s with the shared FailureClassifier rule',
    async (_label, error, expected) => {
      const { dispatcher } = setup();
      dispatcher.register(
        TaskUpdated,
        new RecordingMessageHandler({ error }).handle,
      );

      expect(
        (
          await dispatcher.dispatch(
            envelopeFor('tasks.task.updated.v1', { id: 't1' }),
            { receiveCount: 1, retryPolicy: policy },
          )
        ).outcome,
      ).toBe(expected);
    },
  );

  it('lets isPermanent replace the default rule', async () => {
    const { dispatcher } = setup({
      isPermanent: (error) =>
        error instanceof Error && error.message === 'bad input',
    });
    dispatcher.register(
      TaskUpdated,
      new RecordingMessageHandler({ error: new Error('bad input') }).handle,
    );
    expect(
      (
        await dispatcher.dispatch(
          envelopeFor('tasks.task.updated.v1', { id: 't1' }),
          { receiveCount: 1, retryPolicy: policy },
        )
      ).outcome,
    ).toBe(DispatchOutcome.DeadLetter);
  });

  it('dead-letters a ZodError thrown inside the handler (a protocol violation)', async () => {
    const { dispatcher } = setup();
    dispatcher.register(
      TaskUpdated,
      new RecordingMessageHandler({ error: new ZodError([]) }).handle,
    );
    expect(
      (
        await dispatcher.dispatch(
          envelopeFor('tasks.task.updated.v1', { id: 't1' }),
          { receiveCount: 1, retryPolicy: policy },
        )
      ).outcome,
    ).toBe(DispatchOutcome.DeadLetter);
  });

  it('dead-letters payloads that fail the contract schema and does not run the handler', async () => {
    const { dispatcher } = setup();
    const handler = new RecordingMessageHandler();
    dispatcher.register(TaskUpdated, handler.handle);

    const result = await dispatcher.dispatch(
      envelopeFor('tasks.task.updated.v1', { id: '' }),
      { receiveCount: 1 },
    );
    expect(result.outcome).toBe(DispatchOutcome.DeadLetter);
    expect(handler.calls).toEqual([]);
  });

  it('dead-letters an invalid payload at once even with a retry policy and the first receive', async () => {
    const { dispatcher } = setup();
    const handler = new RecordingMessageHandler();
    dispatcher.register(TaskUpdated, handler.handle);

    expect(
      await dispatcher.dispatch(
        envelopeFor('tasks.task.updated.v1', { id: '' }),
        { receiveCount: 1, retryPolicy: policy },
      ),
    ).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: MessagingErrorCode.InvalidPayload,
    });
    expect(handler.calls).toEqual([]);
  });

  it('dead-letters malformed envelopes', async () => {
    const { dispatcher } = setup();
    expect(
      (await dispatcher.dispatch({ nope: true }, { receiveCount: 1 })).outcome,
    ).toBe(DispatchOutcome.DeadLetter);
  });

  it('ignores unknown event types and dead-letters unknown command types when a topology is given', async () => {
    const topic = new TopicDef('events');
    const queue = new QueueDef('notifications')
      .subscribesTo(topic)
      .deadLetter({ maxReceiveCount: 5 });
    function known(): Topology {
      const topics = [topic];
      const queues = [queue];
      const routes = [
        Route.event('some.event.v1').to(topic),
        Route.command('some.command.v1').to(
          new QueueDef('work').deadLetter({ maxReceiveCount: 5 }),
        ),
      ];
      return new Topology({ topics, queues, routes });
    }
    const { dispatcher } = setup({ topology: known() });

    expect(
      await dispatcher.dispatch(envelopeFor('some.event.v1', {}), {
        receiveCount: 1,
      }),
    ).toEqual({
      outcome: DispatchOutcome.Ignored,
      id: 'msg-1',
      type: 'some.event.v1',
    });
    expect(
      (
        await dispatcher.dispatch(envelopeFor('some.command.v1', {}), {
          receiveCount: 1,
        })
      ).outcome,
    ).toBe(DispatchOutcome.DeadLetter);
  });

  it('dead-letters unknown types when no topology is given', async () => {
    const { dispatcher } = setup();
    expect(
      (
        await dispatcher.dispatch(envelopeFor('unknown.type', {}), {
          receiveCount: 1,
        })
      ).outcome,
    ).toBe(DispatchOutcome.DeadLetter);
  });

  it('runs the claim and the handler inside runInContext, in order', async () => {
    const calls: string[] = [];
    const { dispatcher } = setup({
      runInContext: async (envelope, fn) => {
        calls.push(`enter:${envelope.type}`);
        await fn();
        calls.push('exit');
      },
    });
    dispatcher.register(GenerateReport, () => {
      calls.push('handler');
    });

    await dispatcher.dispatch(
      envelopeFor('reports.report.generate.v1', { reportId: 'r1' }),
      { receiveCount: 1 },
    );
    expect(calls).toEqual([
      'enter:reports.report.generate.v1',
      'handler',
      'exit',
    ]);
  });

  it('turns a claim failure into RetryLater instead of throwing', async () => {
    const { dispatcher } = setup({
      processed: new FailingProcessedMessageStore(
        StoreOperation.Claim,
        new Error('connection reset'),
      ),
    });
    const handler = new RecordingMessageHandler();
    dispatcher.register(TaskUpdated, handler.handle);

    const result = await dispatcher.dispatch(
      envelopeFor('tasks.task.updated.v1', { id: 't1' }),
      { receiveCount: 1, retryPolicy: policy },
    );
    expect(result).toEqual({
      outcome: DispatchOutcome.RetryLater,
      id: 'msg-1',
      delayMs: 100,
      error: 'connection reset',
    });
    expect(handler.calls).toEqual([]);
  });

  it('keys idempotency on (consumer, id): two consumers both process the same message', async () => {
    const shared = new InMemoryProcessedMessageStore();
    const first = new MessageDispatcher({
      consumer: 'notifications',
      processed: shared,
    });
    const second = new MessageDispatcher({
      consumer: 'audit',
      processed: shared,
    });
    const handler = new RecordingMessageHandler();
    first.register(TaskUpdated, handler.handle);
    second.register(TaskUpdated, handler.handle);
    const raw = envelopeFor('tasks.task.updated.v1', { id: 't1' });

    expect((await first.dispatch(raw, { receiveCount: 1 })).outcome).toBe(
      DispatchOutcome.Processed,
    );
    expect((await second.dispatch(raw, { receiveCount: 1 })).outcome).toBe(
      DispatchOutcome.Processed,
    );
    expect((await first.dispatch(raw, { receiveCount: 2 })).outcome).toBe(
      DispatchOutcome.Duplicate,
    );
    expect(handler.calls).toHaveLength(2);
  });

  it('rejects a second handler for the same type', () => {
    const { dispatcher } = setup();
    dispatcher.register(TaskUpdated, () => undefined);
    expect(() => dispatcher.register(TaskUpdated, () => undefined)).toThrow(
      expect.objectContaining({
        code: MessagingErrorCode.DuplicateHandler,
      }),
    );
  });
});

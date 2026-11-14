import { defineCommand, defineEvent } from '@contracts/platform';
import { z, ZodError } from 'zod';
import { createEnvelope } from '../envelope/message-envelope.js';
import { MessagingErrorCode } from '../errors/messaging-error.js';
import { QueueDef } from '../topology/queue-def.js';
import { RetryPolicy } from '../topology/retry-policy.js';
import { Route } from '../topology/route.js';
import { TopicDef } from '../topology/topic-def.js';
import { Topology } from '../topology/topology.js';
import { PermanentMessageError } from './classify-error.js';
import { DispatchOutcome, MessageDispatcher } from './message-dispatcher.js';
import {
  InMemoryProcessedMessageStore,
  type ProcessedMessageStore,
} from './processed-message-store.js';

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

const policy = RetryPolicy.exponential({
  maxAttempts: 3,
  baseMs: 100,
  maxMs: 10_000,
  jitter: false,
});

/** An error the shared classifier treats as transient. */
function transient(message: string): Error {
  return Object.assign(new Error(message), { retryable: true });
}

function envelopeFor(type: string, data: unknown, id = 'msg-1'): unknown {
  return createEnvelope({ type, source: '/test', data }, { newId: () => id });
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
    const handler = jest.fn();
    dispatcher.register(TaskUpdated, handler);

    const raw = envelopeFor('tasks.task.updated.v1', { id: 't1' });
    expect(await dispatcher.dispatch(raw, { receiveCount: 1 })).toEqual({
      outcome: DispatchOutcome.Processed,
      id: 'msg-1',
    });
    expect(await dispatcher.dispatch(raw, { receiveCount: 2 })).toEqual({
      outcome: DispatchOutcome.Duplicate,
      id: 'msg-1',
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]).toEqual({ id: 't1' });
  });

  it('asks for a retry with backoff delay while attempts remain', async () => {
    const { dispatcher } = setup();
    dispatcher.register(TaskUpdated, () => {
      throw transient('database unavailable');
    });
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
    const { dispatcher } = setup();
    let fail = true;
    const handler = jest.fn(() => {
      if (fail) throw transient('transient');
    });
    dispatcher.register(TaskUpdated, handler);
    const raw = envelopeFor('tasks.task.updated.v1', { id: 't1' });

    expect(
      (await dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.RetryLater);
    fail = false;
    expect(
      await dispatcher.dispatch(raw, { receiveCount: 2, retryPolicy: policy }),
    ).toEqual({
      outcome: DispatchOutcome.Processed,
      id: 'msg-1',
    });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('dead-letters once the max attempts are reached', async () => {
    const { dispatcher } = setup();
    dispatcher.register(TaskUpdated, () =>
      Promise.reject(new Error('still failing')),
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
    dispatcher.register(TaskUpdated, () => {
      throw new Error('boom');
    });
    const result = await dispatcher.dispatch(
      envelopeFor('tasks.task.updated.v1', { id: 't1' }),
      { receiveCount: 1 },
    );
    expect(result.outcome).toBe(DispatchOutcome.DeadLetter);
  });

  it('dead-letters PermanentMessageError without retrying', async () => {
    const { dispatcher } = setup();
    dispatcher.register(TaskUpdated, () => {
      throw new PermanentMessageError('task no longer exists');
    });
    expect(
      await dispatcher.dispatch(
        envelopeFor('tasks.task.updated.v1', { id: 't1' }),
        {
          receiveCount: 1,
          retryPolicy: policy,
        },
      ),
    ).toEqual({
      outcome: DispatchOutcome.DeadLetter,
      id: 'msg-1',
      error: 'task no longer exists',
      code: MessagingErrorCode.PermanentError,
    });
  });

  it('classifies handler errors with the shared classifyFailure rule', async () => {
    const { dispatcher } = setup();
    const domainError = (retryable?: boolean) =>
      Object.assign(new Error('insufficient stock'), {
        code: 'INVENTORY.STOCK.EMPTY',
        retryable,
      });
    const timeout = Object.assign(new Error('slow'), { name: 'TimeoutError' });
    let next: unknown;
    dispatcher.register(TaskUpdated, () => {
      throw next;
    });
    const raw = envelopeFor('tasks.task.updated.v1', { id: 't1' });

    next = domainError(false);
    expect(
      (await dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.DeadLetter);
    // Without any signal the platform rule does not retry.
    next = domainError(undefined);
    expect(
      await dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy }),
    ).toMatchObject({
      outcome: DispatchOutcome.DeadLetter,
      code: 'INVENTORY.STOCK.EMPTY',
    });
    next = domainError(true);
    expect(
      (await dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.RetryLater);
    // A timeout leaves the result uncertain; the claim makes a retry safe.
    next = timeout;
    expect(
      (await dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.RetryLater);
    next = new Error('unclassified');
    expect(
      (await dispatcher.dispatch(raw, { receiveCount: 1, retryPolicy: policy }))
        .outcome,
    ).toBe(DispatchOutcome.DeadLetter);
  });

  it('lets isPermanent replace the default rule', async () => {
    const { dispatcher } = setup({
      isPermanent: (error) =>
        error instanceof Error && error.message === 'bad input',
    });
    dispatcher.register(TaskUpdated, () => {
      throw new Error('bad input');
    });
    expect(
      (
        await dispatcher.dispatch(
          envelopeFor('tasks.task.updated.v1', { id: 't1' }),
          {
            receiveCount: 1,
            retryPolicy: policy,
          },
        )
      ).outcome,
    ).toBe(DispatchOutcome.DeadLetter);
  });

  it('dead-letters a ZodError thrown inside the handler (a protocol violation)', async () => {
    const { dispatcher } = setup();
    dispatcher.register(TaskUpdated, () => {
      throw new ZodError([]);
    });
    expect(
      (
        await dispatcher.dispatch(
          envelopeFor('tasks.task.updated.v1', { id: 't1' }),
          {
            receiveCount: 1,
            retryPolicy: policy,
          },
        )
      ).outcome,
    ).toBe(DispatchOutcome.DeadLetter);
  });

  it('dead-letters payloads that fail the contract schema and does not run the handler', async () => {
    const { dispatcher } = setup();
    const handler = jest.fn();
    dispatcher.register(TaskUpdated, handler);

    const result = await dispatcher.dispatch(
      envelopeFor('tasks.task.updated.v1', { id: '' }),
      { receiveCount: 1 },
    );
    expect(result.outcome).toBe(DispatchOutcome.DeadLetter);
    expect(handler).not.toHaveBeenCalled();
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
    class Known extends Topology {
      readonly topics = [topic];
      readonly queues = [queue];
      readonly routes = [
        Route.event('some.event.v1').to(topic),
        Route.command('some.command.v1').to(
          new QueueDef('work').deadLetter({ maxReceiveCount: 5 }),
        ),
      ];
    }
    const { dispatcher } = setup({ topology: new Known() });

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
    const failingStore: ProcessedMessageStore = {
      claim: () => Promise.reject(new Error('connection reset')),
      complete: () => Promise.resolve(),
      release: () => Promise.resolve(),
    };
    const { dispatcher } = setup({ processed: failingStore });
    const handler = jest.fn();
    dispatcher.register(TaskUpdated, handler);

    const result = await dispatcher.dispatch(
      envelopeFor('tasks.task.updated.v1', { id: 't1' }),
      {
        receiveCount: 1,
        retryPolicy: policy,
      },
    );
    expect(result).toEqual({
      outcome: DispatchOutcome.RetryLater,
      id: 'msg-1',
      delayMs: 100,
      error: 'connection reset',
    });
    expect(handler).not.toHaveBeenCalled();
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
    const handler = jest.fn();
    first.register(TaskUpdated, handler);
    second.register(TaskUpdated, handler);
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
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('rejects a second handler for the same type', () => {
    const { dispatcher } = setup();
    dispatcher.register(TaskUpdated, () => undefined);
    expect(() => dispatcher.register(TaskUpdated, () => undefined)).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.DuplicateHandler }),
    );
  });
});

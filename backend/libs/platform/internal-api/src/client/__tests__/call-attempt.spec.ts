import { defineOperation } from '@contracts/platform';
import { FixedClock } from '@platform/kernel/test-utils';
import {
  Tracing,
  TraceContextRestorer,
  Redactor,
} from '@platform/observability';
import { CallOutcome, CallOutcomeKind, Deadline } from '@platform/primitives';
import { z } from 'zod';
import { OperationResolver } from '../../contract/operation-resolver.js';
import { CallAttempt } from '../call-attempt.js';
import { ClientOutcomeChecker } from '../client-outcome-checker.js';
import { PayloadLimit } from '../../contract/payload-limit.js';
import { RetryableOutcomeError } from '../retryable-outcome.error.js';
import { ScriptedTransport } from './utils/scripted-transport.js';

const Create = defineOperation({
  id: 'billing.invoices.create.v1',
  input: z.object({ amount: z.number() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  mutating: false,
  description: 'Creates an invoice.',
});

const descriptor = new OperationResolver().resolve(Create);
const TRACEPARENT = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

describe('CallAttempt', () => {
  function setup(
    transport: ScriptedTransport,
    options: {
      idempotencyKey: string;
      traceparent?: string;
      tenantId?: string;
      actorId?: string;
    },
  ) {
    return new CallAttempt(
      transport,
      new ClientOutcomeChecker(new PayloadLimit()),
      new TraceContextRestorer(new Tracing(new Redactor())),
      descriptor,
      { amount: 5 },
      options,
    );
  }

  function attemptContext(clock: FixedClock, budgetMs: number) {
    return {
      number: 1,
      deadline: Deadline.at(clock.now().getTime() + budgetMs, clock),
    };
  }

  it('sends the metadata of the call with the deadline of the attempt', async () => {
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const transport = new ScriptedTransport().thenReturn(
      CallOutcome.success({ id: 'i-1' }),
    );
    const controller = new AbortController();

    await setup(transport, {
      idempotencyKey: 'key-1',
      traceparent: TRACEPARENT,
      tenantId: 'tenant-1',
      actorId: 'actor-1',
    }).run(controller.signal, attemptContext(clock, 1200));

    expect(transport.metas[0]).toEqual({
      idempotencyKey: 'key-1',
      traceparent: TRACEPARENT,
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      timeoutMs: 1200,
      deadline: clock.now().getTime() + 1200,
      signal: controller.signal,
    });
  });

  it('reports the attempt as started only after it is sent', async () => {
    const clock = new FixedClock();
    const transport = new ScriptedTransport().thenReturn(
      CallOutcome.success({ id: 'i-1' }),
    );
    const attempt = setup(transport, { idempotencyKey: 'key-1' });

    expect(attempt.started).toBe(false);
    await attempt.run(new AbortController().signal, attemptContext(clock, 100));
    expect(attempt.started).toBe(true);
  });

  it('returns the parsed success value', async () => {
    const clock = new FixedClock();
    const transport = new ScriptedTransport().thenReturn(
      CallOutcome.success({ id: 'i-1', extra: 1 }),
    );

    await expect(
      setup(transport, { idempotencyKey: 'key-1' }).run(
        new AbortController().signal,
        attemptContext(clock, 100),
      ),
    ).resolves.toEqual({ kind: CallOutcomeKind.Success, value: { id: 'i-1' } });
  });

  it('rejects a transient failure as retryable and keeps its retry hint', async () => {
    const clock = new FixedClock();
    const transport = new ScriptedTransport().thenReturn(
      CallOutcome.transientFailure('busy', { retryAfterMs: 50 }),
    );

    await expect(
      setup(transport, { idempotencyKey: 'key-1' }).run(
        new AbortController().signal,
        attemptContext(clock, 100),
      ),
    ).rejects.toMatchObject({ retryAfterMs: 50 });
  });

  it('rejects an uncertain outcome as retryable', async () => {
    const clock = new FixedClock();
    const transport = new ScriptedTransport().thenReturn(
      CallOutcome.uncertain('timeout'),
    );

    await expect(
      setup(transport, { idempotencyKey: 'key-1' }).run(
        new AbortController().signal,
        attemptContext(clock, 100),
      ),
    ).rejects.toBeInstanceOf(RetryableOutcomeError);
  });

  it('propagates an error of the transport', async () => {
    const clock = new FixedClock();
    const error = new Error('socket hang up');
    const transport = new ScriptedTransport().thenThrow(error);

    await expect(
      setup(transport, { idempotencyKey: 'key-1' }).run(
        new AbortController().signal,
        attemptContext(clock, 100),
      ),
    ).rejects.toBe(error);
  });
});

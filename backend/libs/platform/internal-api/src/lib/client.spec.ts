import { defineOperation, PlatformErrorCode } from '@contracts/platform';
import { context as otelContext } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { DomainError } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/testing';
import {
  CallOutcome,
  CallOutcomeKind,
  Deadline,
  type CallOutcome as Outcome,
} from '@platform/primitives';
import { contextFromTraceparent } from '@platform/observability';
import { z } from 'zod';
import { Operation, OperationContract } from './contract.js';
import { InternalApiErrorCode } from './errors.js';
import { InternalClient } from './client.js';
import {
  MAX_CALL_IDEMPOTENCY_KEY_LENGTH,
  MAX_TENANT_ID_LENGTH,
} from './limits.js';
import { ContractRegistry } from './registry.js';
import { InternalApiReason, type InputViolationOutcome } from './result.js';
import type { CallMeta, Transport } from './transport.js';

const NO_FUNDS = 'BILLING.RESERVE.NO_FUNDS';

const ok = CallOutcome.success({ id: 'r-1' });
const transient = CallOutcome.transientFailure('network');

const Reserve = defineOperation({
  id: 'billing.reserve.v1',
  input: z.object({ amount: z.number().positive() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  compensatedBy: 'billing.release.v1',
  errors: [NO_FUNDS],
  description: 'Reserves funds.',
});

const Release = defineOperation({
  id: 'billing.release.v1',
  input: z.object({ id: z.string() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  compensatedBy: 'billing.reserve.v1',
  description: 'Releases funds.',
});

const Charge = defineOperation({
  id: 'billing.charge.v1',
  input: z.object({ amount: z.number() }),
  output: z.object({ id: z.string() }),
  idempotent: false,
  compensatedBy: 'billing.refund.v1',
  retry: { maxAttempts: 5, baseMs: 10, maxMs: 20 },
  timeoutMs: 7,
  description: 'Charges once.',
});

const Refund = defineOperation({
  id: 'billing.refund.v1',
  input: z.object({ id: z.string() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  compensatedBy: 'billing.charge.v1',
  description: 'Refunds a charge.',
});

const SlowRefund = defineOperation({
  id: 'billing.slow-refund.v1',
  input: z.object({ id: z.string() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  compensatedBy: 'billing.charge.v1',
  timeoutMs: 5,
  description: 'A refund that may hang.',
});

const RetryPolicyOp = defineOperation({
  id: 'billing.retry-policy.v1',
  input: z.object({ amount: z.number() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  compensatedBy: 'billing.reserve.v1',
  retry: { maxAttempts: 2, baseMs: 10, maxMs: 20 },
  description: 'Has its own retry policy.',
});

const Unregistered = defineOperation({
  id: 'billing.unregistered.v1',
  input: z.object({ id: z.string() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  mutating: false,
  description: 'Never registered.',
});

@Operation({
  id: 'billing.legacy.v1',
  compensatedBy: 'billing.release.v1',
  idempotent: true,
})
class LegacyReserve extends OperationContract<
  { amount: number },
  { id: string }
> {
  readonly input = z.object({ amount: z.number() });
  readonly output = z.object({ id: z.string() });
}

class NoFundsError extends DomainError {
  readonly code = NO_FUNDS;
}

type Scripted = Outcome<unknown> | Error | 'hang';

function fakeTransport(results: Scripted[]) {
  const invoke = jest.fn<
    Promise<Outcome<unknown>>,
    [string, unknown, CallMeta]
  >(async () => {
    const next = results.shift();
    if (next === undefined) {
      throw new Error('no more scripted results');
    }
    if (next instanceof Error) {
      throw next;
    }
    if (next === 'hang') {
      return new Promise<Outcome<unknown>>(() => undefined);
    }
    return next;
  });
  return { transport: { invoke } as Transport, invoke };
}

function setup(
  results: Scripted[],
  random = () => 0,
  maxPayloadBytes?: number,
) {
  const registry = new ContractRegistry();
  registry.register(
    Reserve,
    Release,
    Charge,
    Refund,
    SlowRefund,
    RetryPolicyOp,
    LegacyReserve,
  );
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const { transport, invoke } = fakeTransport(results);
  const sleep = jest.fn<Promise<void>, [number, AbortSignal?]>(
    async () => undefined,
  );
  const client = new InternalClient({
    transport,
    registry,
    sleep,
    random,
    clock,
    ...(maxPayloadBytes !== undefined && { maxPayloadBytes }),
  });
  return { client, invoke, sleep, clock, registry };
}

const options = { idempotencyKey: 'key-1' };

function econnreset(): Error {
  return Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
}

describe('InternalClient', () => {
  describe('contract checks before the call', () => {
    it('returns the invalid input business error with field errors, without calling the transport', async () => {
      const { client, invoke } = setup([]);

      const outcome = await client.call(Reserve, { amount: -1 }, options);

      expect(outcome).toEqual({
        kind: CallOutcomeKind.BusinessError,
        code: PlatformErrorCode.ValidationInvalidInput,
        message: `Invalid input for "${Reserve.id}"`,
        details: {
          fieldErrors: [
            { field: 'amount', code: PlatformErrorCode.ValidationTooSmall },
          ],
        },
      });
      expect(
        (outcome as InputViolationOutcome).details.fieldErrors,
      ).toHaveLength(1);
      expect(invoke).not.toHaveBeenCalled();
    });

    it.each([
      ['an empty key', { idempotencyKey: ' ' }],
      [
        'an oversized key',
        {
          idempotencyKey: 'k'.repeat(MAX_CALL_IDEMPOTENCY_KEY_LENGTH + 1),
        },
      ],
      [
        'an oversized tenant',
        {
          idempotencyKey: 'key-1',
          tenantId: 't'.repeat(MAX_TENANT_ID_LENGTH + 1),
        },
      ],
    ])('rejects %s without calling the transport', async (_label, call) => {
      const { client, invoke } = setup([]);

      await expect(client.call(Reserve, { amount: 1 }, call)).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.InvalidIdempotencyKey,
          InternalApiErrorCode.InvalidIdempotencyKey,
        ),
      );
      expect(invoke).not.toHaveBeenCalled();
    });

    it('rejects an operation that is not registered', async () => {
      const { client, invoke } = setup([]);

      const outcome = await client.call(Unregistered, { id: 'x' }, options);

      expect(outcome).toMatchObject({
        kind: CallOutcomeKind.ProtocolViolation,
        code: InternalApiErrorCode.UnknownOperation,
      });
      expect(invoke).not.toHaveBeenCalled();
    });

    it('rejects a value that is not an operation', async () => {
      const { client } = setup([]);
      const notAnOperation = { id: 'x' } as unknown as typeof Reserve;

      await expect(
        client.call(notAnOperation, { amount: 1 }, options),
      ).resolves.toMatchObject({
        kind: CallOutcomeKind.ProtocolViolation,
        code: InternalApiErrorCode.InvalidOperation,
      });
    });

    it('rejects an input larger than the payload limit, without calling the transport', async () => {
      const { client, invoke } = setup([], () => 0, 64);

      const outcome = await client.call(
        Reserve,
        { amount: 1, padding: 'x'.repeat(100) } as { amount: number },
        options,
      );

      expect(outcome).toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.PayloadTooLarge,
          InternalApiErrorCode.PayloadTooLarge,
        ),
      );
      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe('sending', () => {
    it('sends the original input and the call metadata', async () => {
      const { client, invoke, clock } = setup([ok]);
      const input = { amount: 5, extra: 'kept' };

      const result = await client.call(Reserve, input, {
        idempotencyKey: 'key-1',
        traceparent: '00-abc-def-01',
        tenantId: 't-1',
        actorId: 'u-1',
      });

      expect(result).toEqual(ok);
      expect(invoke).toHaveBeenCalledWith(
        'billing.reserve.v1',
        input,
        expect.objectContaining({
          idempotencyKey: 'key-1',
          traceparent: '00-abc-def-01',
          tenantId: 't-1',
          actorId: 'u-1',
          timeoutMs: 5000,
          deadline: clock.now().getTime() + 5000,
          signal: expect.any(AbortSignal),
        }),
      );
      expect(invoke.mock.calls[0]?.[1]).toBe(input);
    });

    it('cuts the attempt to the remaining budget of the caller deadline', async () => {
      const { client, invoke, clock } = setup([ok]);
      const deadline = Deadline.after(1200, clock);

      await client.call(Reserve, { amount: 1 }, { ...options, deadline });

      expect(invoke.mock.calls[0]?.[2]).toMatchObject({
        timeoutMs: 1200,
        deadline: deadline.atMs,
      });
    });

    it('returns a transient failure without calling when the deadline already passed', async () => {
      const { client, invoke, clock } = setup([ok]);
      const deadline = Deadline.after(10, clock);
      clock.advance(10);

      await expect(
        client.call(Reserve, { amount: 1 }, { ...options, deadline }),
      ).resolves.toEqual(
        CallOutcome.transientFailure(InternalApiReason.DeadlineExceeded),
      );
      expect(invoke).not.toHaveBeenCalled();
    });

    it('works without a registry, straight from the descriptor', async () => {
      const { transport, invoke } = fakeTransport([ok]);
      const client = new InternalClient({ transport });

      await expect(
        client.call(Unregistered, { id: 'x' }, options),
      ).resolves.toEqual(ok);
      expect(invoke).toHaveBeenCalledTimes(1);
    });

    it('calls a registered operation by id', async () => {
      const { client, invoke } = setup([ok]);

      await expect(
        client.callById('billing.reserve.v1', { amount: 2 }, options),
      ).resolves.toEqual(ok);
      await expect(
        client.callById('billing.nope.v1', {}, options),
      ).resolves.toMatchObject({
        kind: CallOutcomeKind.ProtocolViolation,
        code: InternalApiErrorCode.UnknownOperation,
      });
      expect(invoke).toHaveBeenCalledTimes(1);
    });

    it('keeps accepting a legacy @Operation class', async () => {
      const { client, invoke } = setup([ok]);

      await expect(
        client.call(LegacyReserve, { amount: 1 }, options),
      ).resolves.toEqual(ok);
      expect(invoke.mock.calls[0]?.[0]).toBe('billing.legacy.v1');
    });
  });

  describe('retries', () => {
    it('retries transient failures of idempotent operations with backoff, then returns the last outcome', async () => {
      const { client, invoke, sleep } = setup([
        transient,
        transient,
        transient,
      ]);

      const result = await client.call(Reserve, { amount: 1 }, options);

      expect(result).toEqual(transient);
      expect(invoke).toHaveBeenCalledTimes(3);
      // random = 0 gives half of the capped delay: min(2000, 100 * 2^n) / 2
      expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([50, 100]);
    });

    it('applies equal jitter within the capped delay', async () => {
      const { client, sleep } = setup(
        [transient, transient, transient],
        () => 0.5,
      );
      await client.call(Reserve, { amount: 1 }, options);
      expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([75, 150]);
    });

    it('waits at least the retryAfterMs the server suggested', async () => {
      const { client, sleep } = setup([
        CallOutcome.transientFailure('busy', { retryAfterMs: 300 }),
        ok,
      ]);
      await client.call(Reserve, { amount: 1 }, options);
      expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([300]);
    });

    it('stops retrying when the next backoff does not fit in the deadline', async () => {
      const { client, invoke, clock } = setup([transient, transient, ok]);
      const deadline = Deadline.after(60, clock);

      const result = await client.call(
        Reserve,
        { amount: 1 },
        { ...options, deadline },
      );

      expect(result).toEqual(transient);
      expect(invoke).toHaveBeenCalledTimes(2);
    });

    it('returns success after a transient failure', async () => {
      const { client, invoke } = setup([transient, ok]);
      await expect(
        client.call(Reserve, { amount: 1 }, options),
      ).resolves.toEqual(ok);
      expect(invoke).toHaveBeenCalledTimes(2);
    });

    it('honours a per-operation retry policy', async () => {
      const { client, invoke } = setup([transient, transient]);
      await client.call(RetryPolicyOp, { amount: 1 }, options);
      expect(invoke).toHaveBeenCalledTimes(2);
    });

    it('never retries a non-idempotent operation', async () => {
      const { client, invoke, sleep } = setup([transient]);
      const result = await client.call(Charge, { amount: 1 }, options);
      expect(result).toEqual(transient);
      expect(invoke).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });
  });

  describe('timeouts and cancellation', () => {
    it('resolves a timed-out attempt as uncertain, aborts its signal and retries idempotent operations', async () => {
      const hanging = fakeTransport(['hang', 'hang', 'hang']);
      const registry = new ContractRegistry();
      registry.register(SlowRefund);
      const client = new InternalClient({
        transport: hanging.transport,
        registry,
        sleep: async () => undefined,
      });

      await expect(
        client.call(SlowRefund, { id: 'x' }, options),
      ).resolves.toEqual(CallOutcome.uncertain(InternalApiReason.Timeout));
      expect(hanging.invoke).toHaveBeenCalledTimes(3);
      expect(hanging.invoke.mock.calls[0]?.[2].signal?.aborted).toBe(true);
    });

    it('uses the operation timeout for a single non-idempotent attempt', async () => {
      const hanging = fakeTransport(['hang']);
      const client = new InternalClient({
        transport: hanging.transport,
        sleep: async () => undefined,
      });

      await expect(
        client.call(Charge, { amount: 1 }, options),
      ).resolves.toEqual(CallOutcome.uncertain(InternalApiReason.Timeout));
      expect(hanging.invoke).toHaveBeenCalledTimes(1);
      expect(hanging.invoke.mock.calls[0]?.[2].timeoutMs).toBe(7);
    });

    it('does not call the transport when the caller signal is already aborted', async () => {
      const { client, invoke } = setup([ok]);

      const outcome = await client.call(
        Reserve,
        { amount: 1 },
        { ...options, signal: AbortSignal.abort() },
      );

      expect(outcome).toEqual(
        CallOutcome.transientFailure(InternalApiReason.Cancelled),
      );
      expect(invoke).not.toHaveBeenCalled();
    });

    it('resolves as uncertain and stops retrying when the caller aborts mid-attempt', async () => {
      const { client, invoke } = setup(['hang', ok]);
      const controller = new AbortController();

      const pending = client.call(
        Reserve,
        { amount: 1 },
        { ...options, signal: controller.signal },
      );
      await Promise.resolve();
      controller.abort();

      await expect(pending).resolves.toEqual(
        CallOutcome.uncertain(InternalApiReason.Cancelled),
      );
      expect(invoke).toHaveBeenCalledTimes(1);
      expect(invoke.mock.calls[0]?.[2].signal?.aborted).toBe(true);
    });
  });

  describe('transport exceptions', () => {
    it('classifies a network error as transient and retries it', async () => {
      const { client, invoke } = setup([econnreset(), ok]);

      await expect(
        client.call(Reserve, { amount: 1 }, options),
      ).resolves.toEqual(ok);
      expect(invoke).toHaveBeenCalledTimes(2);
    });

    it('classifies an unknown error as a protocol violation and does not retry it', async () => {
      const { client, invoke } = setup([new Error('boom'), ok]);

      await expect(
        client.call(Reserve, { amount: 1 }, options),
      ).resolves.toMatchObject({ kind: CallOutcomeKind.ProtocolViolation });
      expect(invoke).toHaveBeenCalledTimes(1);
    });

    it('turns a thrown declared domain error into a business error', async () => {
      const { client } = setup([new NoFundsError('Low balance')]);

      await expect(
        client.call(Reserve, { amount: 1 }, options),
      ).resolves.toMatchObject({
        kind: CallOutcomeKind.BusinessError,
        code: NO_FUNDS,
      });
    });
  });

  describe('outcomes', () => {
    it('returns a declared business error as is, without retrying', async () => {
      const businessError = CallOutcome.businessError(NO_FUNDS, {
        message: 'Low balance',
      });
      const { client, invoke } = setup([businessError]);
      await expect(
        client.call(Reserve, { amount: 1 }, options),
      ).resolves.toEqual(businessError);
      expect(invoke).toHaveBeenCalledTimes(1);
    });

    it('maps an undeclared business error to a protocol violation, without retrying', async () => {
      const { client, invoke } = setup([CallOutcome.businessError('SURPRISE')]);
      await expect(
        client.call(Reserve, { amount: 1 }, options),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UndeclaredError,
          'SURPRISE',
        ),
      );
      expect(invoke).toHaveBeenCalledTimes(1);
    });

    it('passes a protocol violation from the transport through without retrying', async () => {
      const violation = CallOutcome.protocolViolation('idempotency-key-reuse');
      const { client, invoke } = setup([violation, ok]);
      await expect(
        client.call(Reserve, { amount: 1 }, options),
      ).resolves.toEqual(violation);
      expect(invoke).toHaveBeenCalledTimes(1);
    });

    it('returns a protocol violation, without throwing, when the output does not match', async () => {
      const { client } = setup([CallOutcome.success({ wrong: true })]);
      await expect(
        client.call(Reserve, { amount: 1 }, options),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.InvalidOutput,
          InternalApiErrorCode.InvalidOutput,
        ),
      );
    });

    it('returns a protocol violation for an output larger than the payload limit', async () => {
      const { client } = setup(
        [CallOutcome.success({ id: 'x'.repeat(200) })],
        () => 0,
        64,
      );
      await expect(
        client.call(Reserve, { amount: 1 }, options),
      ).resolves.toMatchObject({ code: InternalApiErrorCode.PayloadTooLarge });
    });

    it('returns the parsed output value on success', async () => {
      const { client } = setup([CallOutcome.success({ id: 'r-9', extra: 1 })]);
      await expect(
        client.call(Reserve, { amount: 1 }, options),
      ).resolves.toEqual(CallOutcome.success({ id: 'r-9' }));
    });
  });
});

describe('InternalClient trace propagation', () => {
  const TRACEPARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
  const manager = new AsyncLocalStorageContextManager();

  beforeAll(() => {
    otelContext.setGlobalContextManager(manager.enable());
  });

  afterAll(() => {
    otelContext.disable();
  });

  it('sends the traceparent of the active span when the caller gives none', async () => {
    const { client, invoke } = setup([ok]);

    await otelContext.with(contextFromTraceparent(TRACEPARENT), () =>
      client.call(Reserve, { amount: 1 }, options),
    );

    expect(invoke.mock.calls[0]?.[2].traceparent).toBe(TRACEPARENT);
  });

  it('prefers the traceparent given by the caller', async () => {
    const { client, invoke } = setup([ok]);
    const given = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

    await otelContext.with(contextFromTraceparent(TRACEPARENT), () =>
      client.call(Reserve, { amount: 1 }, { ...options, traceparent: given }),
    );

    expect(invoke.mock.calls[0]?.[2].traceparent).toBe(given);
  });

  it('sends no traceparent outside a trace', async () => {
    const { client, invoke } = setup([ok]);

    await client.call(Reserve, { amount: 1 }, options);

    expect(invoke.mock.calls[0]?.[2]).not.toHaveProperty('traceparent');
  });
});

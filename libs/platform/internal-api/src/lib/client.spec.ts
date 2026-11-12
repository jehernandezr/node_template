import { z } from 'zod';
import { Operation, OperationContract } from './contract.js';
import { InternalApiError, InternalApiErrorCode } from './errors.js';
import { InternalClient } from './client.js';
import { ContractRegistry } from './registry.js';
import { ResultKind } from './result.js';
import type { OperationResult } from './result.js';
import type { CallMeta, Transport } from './transport.js';

const ok = { kind: ResultKind.Success as const, value: { id: 'r-1' } };
const transient = {
  kind: ResultKind.TransientFailure as const,
  reason: 'network',
};

@Operation({
  id: 'billing.reserve.v1',
  compensatedBy: 'billing.release.v1',
  idempotent: true,
  errors: ['NO_FUNDS'],
})
class Reserve extends OperationContract<{ amount: number }, { id: string }> {
  readonly input = z.object({ amount: z.number().positive() });
  readonly output = z.object({ id: z.string() });
}

@Operation({
  id: 'billing.release.v1',
  compensatedBy: 'billing.reserve.v1',
  idempotent: true,
})
class Release extends OperationContract<{ id: string }, { id: string }> {
  readonly input = z.object({ id: z.string() });
  readonly output = z.object({ id: z.string() });
}

@Operation({
  id: 'billing.charge.v1',
  compensatedBy: 'billing.refund.v1',
  idempotent: false,
  retry: { maxAttempts: 5, baseMs: 10, maxMs: 20 },
  timeoutMs: 7,
})
class Charge extends OperationContract<{ amount: number }, { id: string }> {
  readonly input = z.object({ amount: z.number() });
  readonly output = z.object({ id: z.string() });
}

@Operation({
  id: 'billing.refund.v1',
  compensatedBy: 'billing.charge.v1',
  idempotent: true,
})
class Refund extends OperationContract<{ id: string }, { id: string }> {
  readonly input = z.object({ id: z.string() });
  readonly output = z.object({ id: z.string() });
}

@Operation({
  id: 'billing.slow-refund.v1',
  compensatedBy: 'billing.charge.v1',
  idempotent: true,
  timeoutMs: 5,
})
class SlowRefund extends OperationContract<{ id: string }, { id: string }> {
  readonly input = z.object({ id: z.string() });
  readonly output = z.object({ id: z.string() });
}

@Operation({
  id: 'billing.retry-policy.v1',
  compensatedBy: 'billing.reserve.v1',
  idempotent: true,
  retry: { maxAttempts: 2, baseMs: 10, maxMs: 20 },
})
class RetryPolicyOp extends OperationContract<
  { amount: number },
  { id: string }
> {
  readonly input = z.object({ amount: z.number() });
  readonly output = z.object({ id: z.string() });
}

@Operation({
  id: 'billing.bad-output.v1',
  compensatedBy: 'billing.release.v1',
  idempotent: true,
})
class BadOutput extends OperationContract<{ amount: number }, { id: string }> {
  readonly input = z.object({ amount: z.number() });
  readonly output = z.object({ id: z.string() });
}

@Operation({
  id: 'billing.unregistered.v1',
  compensatedBy: 'billing.release.v1',
  idempotent: true,
})
class Unregistered extends OperationContract<{ id: string }, { id: string }> {
  readonly input = z.object({ id: z.string() });
  readonly output = z.object({ id: z.string() });
}

function fakeTransport(
  results: Array<OperationResult<unknown> | Error | 'hang'>,
) {
  const invoke = jest.fn<
    Promise<OperationResult<unknown>>,
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
      return new Promise<OperationResult<unknown>>(() => undefined);
    }
    return next;
  });
  return { transport: { invoke } as Transport, invoke };
}

function setup(
  results: Array<OperationResult<unknown> | Error | 'hang'>,
  random = () => 0,
) {
  const registry = new ContractRegistry();
  registry.register(
    Reserve,
    Release,
    Charge,
    Refund,
    SlowRefund,
    RetryPolicyOp,
    BadOutput,
  );
  const { transport, invoke } = fakeTransport(results);
  const sleep = jest.fn<Promise<void>, [number]>(async () => undefined);
  const client = new InternalClient({ transport, registry, sleep, random });
  return { client, invoke, sleep };
}

const options = { idempotencyKey: 'key-1' };

describe('InternalClient', () => {
  it('throws InvalidInput before any transport call', async () => {
    const { client, invoke } = setup([]);
    const error = await client
      .call(Reserve, { amount: -1 }, options)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InternalApiError);
    expect((error as InternalApiError).code).toBe(
      InternalApiErrorCode.InvalidInput,
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it('requires a non-empty idempotency key', async () => {
    const { client, invoke } = setup([]);
    await expect(
      client.call(Reserve, { amount: 1 }, { idempotencyKey: ' ' }),
    ).rejects.toMatchObject({
      code: InternalApiErrorCode.InvalidInput,
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('rejects an operation that is not registered', async () => {
    const { client, invoke } = setup([]);
    await expect(
      client.call(Unregistered, { id: 'x' }, options),
    ).rejects.toMatchObject({
      code: InternalApiErrorCode.UnknownOperation,
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('sends the validated input and the call metadata', async () => {
    const { client, invoke } = setup([ok]);
    const result = await client.call(
      Reserve,
      { amount: 5 },
      {
        idempotencyKey: 'key-1',
        traceparent: '00-abc-def-01',
        tenantId: 't-1',
        actorId: 'u-1',
      },
    );
    expect(result).toEqual(ok);
    expect(invoke).toHaveBeenCalledWith(
      'billing.reserve.v1',
      { amount: 5 },
      expect.objectContaining({
        idempotencyKey: 'key-1',
        traceparent: '00-abc-def-01',
        tenantId: 't-1',
        actorId: 'u-1',
        timeoutMs: 5000,
        deadline: expect.any(Number),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('retries transient failures for idempotent operations with backoff, then returns the last result', async () => {
    const { client, invoke, sleep } = setup([transient, transient, transient]);
    const result = await client.call(Reserve, { amount: 1 }, options);
    expect(result).toEqual(transient);
    expect(invoke).toHaveBeenCalledTimes(3);
    // random = 0 gives half of the capped delay: min(2000, 100 * 2^n) / 2
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([50, 100]);
  });

  it('applies jitter within the capped delay', async () => {
    const { client, sleep } = setup([transient, transient, transient], () => 1);
    await client.call(Reserve, { amount: 1 }, options);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([100, 200]);
  });

  it('returns success after a transient failure', async () => {
    const { client, invoke } = setup([transient, ok]);
    await expect(client.call(Reserve, { amount: 1 }, options)).resolves.toEqual(
      ok,
    );
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

  it('resolves a timed-out attempt as TransientFailure and retries idempotent operations', async () => {
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
    ).resolves.toEqual({
      kind: ResultKind.TransientFailure,
      reason: 'timeout',
    });
    expect(hanging.invoke).toHaveBeenCalledTimes(3);
  });

  it('uses the operation timeout for a single non-idempotent attempt', async () => {
    const hanging = fakeTransport(['hang']);
    const registry = new ContractRegistry();
    registry.register(Charge, Refund);
    const client = new InternalClient({
      transport: hanging.transport,
      registry,
      sleep: async () => undefined,
    });
    await expect(client.call(Charge, { amount: 1 }, options)).resolves.toEqual({
      kind: ResultKind.TransientFailure,
      reason: 'timeout',
    });
    expect(hanging.invoke).toHaveBeenCalledWith(
      'billing.charge.v1',
      { amount: 1 },
      expect.objectContaining({ timeoutMs: 7 }),
    );
  });

  it('converts a transport exception into TransientFailure', async () => {
    const cause = new Error('socket reset');
    const { client, invoke } = setup([cause]);
    const result = await client.call(Charge, { amount: 1 }, options);
    expect(result).toEqual({
      kind: ResultKind.TransientFailure,
      reason: 'transport-error',
      cause,
    });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('returns a declared business error as is, without retrying', async () => {
    const businessError = {
      kind: ResultKind.BusinessError as const,
      code: 'NO_FUNDS',
      message: 'Low balance',
    };
    const { client, invoke } = setup([businessError]);
    await expect(client.call(Reserve, { amount: 1 }, options)).resolves.toEqual(
      businessError,
    );
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('maps an undeclared business error to ProtocolViolation undeclared-error, without retrying', async () => {
    const businessError = {
      kind: ResultKind.BusinessError as const,
      code: 'SURPRISE',
    };
    const { client, invoke } = setup([businessError]);
    await expect(client.call(Reserve, { amount: 1 }, options)).resolves.toEqual(
      {
        kind: ResultKind.ProtocolViolation,
        reason: 'undeclared-error',
        code: 'SURPRISE',
      },
    );
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('transmits the original input object, not the parsed copy', async () => {
    const { client, invoke } = setup([ok]);
    const input = { amount: 5, extra: 'kept' };
    await client.call(Reserve, input, options);
    expect(invoke.mock.calls[0]?.[1]).toBe(input);
  });

  it('aborts the transport signal when the attempt times out', async () => {
    const hanging = fakeTransport(['hang']);
    const registry = new ContractRegistry();
    registry.register(SlowRefund);
    const client = new InternalClient({
      transport: hanging.transport,
      registry,
      sleep: async () => undefined,
    });
    await client.call(SlowRefund, { id: 'x' }, options);
    const meta = hanging.invoke.mock.calls[0]?.[2];
    expect(meta?.signal?.aborted).toBe(true);
    expect(meta?.deadline).toBeGreaterThan(Date.now() - 1000);
  });

  it('passes a ProtocolViolation from the transport through without retrying', async () => {
    const violation = {
      kind: ResultKind.ProtocolViolation as const,
      reason: 'idempotency-key-reuse',
    };
    const { client, invoke } = setup([violation, ok]);
    await expect(client.call(Reserve, { amount: 1 }, options)).resolves.toEqual(
      violation,
    );
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('validates the output of a success and throws InvalidOutput when it does not match', async () => {
    const { client } = setup([
      { kind: ResultKind.Success, value: { wrong: true } },
    ]);
    await expect(
      client.call(BadOutput, { amount: 1 }, options),
    ).rejects.toMatchObject({
      code: InternalApiErrorCode.InvalidOutput,
    });
  });

  it('returns the parsed output value on success', async () => {
    const { client } = setup([
      { kind: ResultKind.Success, value: { id: 'r-9', extra: 1 } },
    ]);
    await expect(client.call(Reserve, { amount: 1 }, options)).resolves.toEqual(
      {
        kind: ResultKind.Success,
        value: { id: 'r-9' },
      },
    );
  });
});

import { z } from 'zod';
import {
  Compensation,
  INVALID_INPUT_CODE,
  Operation,
  OperationContract,
} from './contract.js';
import { InternalApiError, InternalApiErrorCode } from './errors.js';
import { ContractRegistry } from './registry.js';
import { InternalRouter } from './router.js';
import { InMemoryProcessedOperationStore } from './store.js';
import { ResultKind } from './result.js';
import type { OperationResult } from './result.js';
import type { CallMeta } from './transport.js';

@Operation({
  id: 'stock.reserve.v1',
  compensatedBy: 'stock.release.v1',
  idempotent: true,
  errors: ['OUT_OF_STOCK'],
})
class Reserve extends OperationContract<
  { sku: string; qty: number },
  { reservationId: string }
> {
  readonly input = z.object({
    sku: z.string(),
    qty: z.number().int().positive(),
  });
  readonly output = z.object({ reservationId: z.string() });
}

@Operation({
  id: 'stock.release.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Idempotent release',
  idempotent: true,
})
class Release extends OperationContract<
  { reservationId: string },
  { released: boolean }
> {
  readonly input = z.object({ reservationId: z.string() });
  readonly output = z.object({ released: z.boolean() });
}

@Operation({ id: 'stock.count.v1', mutating: false, idempotent: true })
class Count extends OperationContract<{ sku: string }, { total: number }> {
  readonly input = z.object({ sku: z.string() });
  readonly output = z.object({ total: z.number() });
}

class Unannotated extends OperationContract<object, object> {
  readonly input = z.object({});
  readonly output = z.object({});
}

const success = (reservationId = 'r-1') => ({
  kind: ResultKind.Success as const,
  value: { reservationId },
});

function meta(idempotencyKey: string, extra: Partial<CallMeta> = {}): CallMeta {
  return {
    idempotencyKey,
    timeoutMs: 1000,
    deadline: Date.now() + 1000,
    ...extra,
  };
}

function setup(leaseMs?: number) {
  const processed = new InMemoryProcessedOperationStore();
  const router = new InternalRouter({
    processed,
    ...(leaseMs !== undefined && { leaseMs }),
  });
  return { router, processed };
}

describe('InternalRouter', () => {
  it('assertComplete passes when every registered operation has a handler', () => {
    const { router } = setup();
    const registry = new ContractRegistry();
    registry.register(Reserve, Release);
    router.register(Reserve, async () => success());
    router.register(Release, async () => ({
      kind: ResultKind.Success,
      value: { released: true },
    }));
    expect(() => router.assertComplete(registry)).not.toThrow();
  });

  it('assertComplete throws MissingHandler listing the missing ids', () => {
    const { router } = setup();
    const registry = new ContractRegistry();
    registry.register(Reserve, Release, Count);
    router.register(Reserve, async () => success());

    let caught: unknown;
    try {
      router.assertComplete(registry);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InternalApiError);
    expect((caught as InternalApiError).code).toBe(
      InternalApiErrorCode.MissingHandler,
    );
    expect((caught as Error).message).toContain('stock.release.v1');
    expect((caught as Error).message).toContain('stock.count.v1');
    expect((caught as Error).message).not.toContain('stock.reserve.v1');
  });

  it('rejects a second handler for the same operation with DuplicateOperation', () => {
    const { router } = setup();
    const handler = async () => ({
      kind: ResultKind.Success as const,
      value: { total: 0 },
    });
    router.register(Count, handler);
    expect(() => router.register(Count, handler)).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.DuplicateOperation,
      }),
    );
  });

  it('rejects a class without @Operation', () => {
    const { router } = setup();
    expect(() =>
      router.register(Unannotated, async () => ({
        kind: ResultKind.Success,
        value: {},
      })),
    ).toThrow(TypeError);
  });

  it('returns a BusinessError for invalid input without running the handler or storing anything', async () => {
    const { router } = setup();
    const handler = jest.fn(async () => success());
    router.register(Reserve, handler);

    const result = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: -1 },
      meta('k-1'),
    );
    expect(result).toMatchObject({
      kind: ResultKind.BusinessError,
      code: INVALID_INPUT_CODE,
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs the handler once for the same key and replays the stored result', async () => {
    const { router } = setup();
    const handler = jest.fn(async () => success());
    router.register(Reserve, handler);

    const first = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-1'),
    );
    const second = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-1'),
    );
    expect(first).toEqual({
      kind: ResultKind.Success,
      value: { reservationId: 'r-1' },
    });
    expect(second).toEqual(first);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('treats the same input with a different key order as the same call', async () => {
    const { router } = setup();
    const handler = jest.fn(async () => success());
    router.register(Reserve, handler);

    await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-order'),
    );
    await router.handle(
      'stock.reserve.v1',
      { qty: 1, sku: 'A' },
      meta('k-order'),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('concurrent calls on one key run the handler once; the second gets in-progress', async () => {
    const { router } = setup();
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const handler = jest.fn(async () => {
      await gate;
      return success();
    });
    router.register(Reserve, handler);

    const first = router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-concurrent'),
    );
    const second = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-concurrent'),
    );
    expect(second).toEqual({
      kind: ResultKind.TransientFailure,
      reason: 'in-progress',
    });

    finish();
    await expect(first).resolves.toEqual({
      kind: ResultKind.Success,
      value: { reservationId: 'r-1' },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('stores a declared BusinessError and replays it', async () => {
    const { router } = setup();
    const handler = jest.fn(async () => ({
      kind: ResultKind.BusinessError as const,
      code: 'OUT_OF_STOCK',
    }));
    router.register(Reserve, handler);

    const first = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-2'),
    );
    const second = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-2'),
    );
    expect(first).toEqual({
      kind: ResultKind.BusinessError,
      code: 'OUT_OF_STOCK',
    });
    expect(second).toEqual(first);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('returns an undeclared business code as ProtocolViolation, does not store it, and releases the claim', async () => {
    const { router } = setup();
    const handler = jest.fn(async () => ({
      kind: ResultKind.BusinessError as const,
      code: 'SURPRISE',
    }));
    router.register(Reserve, handler);

    const first = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-undeclared'),
    );
    expect(first).toEqual({
      kind: ResultKind.ProtocolViolation,
      reason: 'undeclared-error',
      code: 'SURPRISE',
    });

    await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-undeclared'),
    );
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('turns a handler throw into ProtocolViolation handler-error, not stored, claim released', async () => {
    const { router } = setup();
    const handler = jest
      .fn<Promise<OperationResult<{ reservationId: string }>>, []>()
      .mockRejectedValueOnce(new Error('boom'));
    handler.mockResolvedValueOnce(success('r-after'));
    router.register(Reserve, handler);

    const first = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-throw'),
    );
    expect(first).toEqual({
      kind: ResultKind.ProtocolViolation,
      reason: 'handler-error',
    });

    const second = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-throw'),
    );
    expect(second).toEqual({
      kind: ResultKind.Success,
      value: { reservationId: 'r-after' },
    });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('validates handler success output: invalid output is ProtocolViolation and not stored', async () => {
    const { router } = setup();
    const handler = jest
      .fn<Promise<OperationResult<{ reservationId: string }>>, []>()
      .mockResolvedValueOnce({
        kind: ResultKind.Success,
        value: { wrong: 1 },
      } as unknown as OperationResult<{ reservationId: string }>)
      .mockResolvedValueOnce(success('r-valid'));
    router.register(Reserve, handler);

    const first = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-output'),
    );
    expect(first).toEqual({
      kind: ResultKind.ProtocolViolation,
      reason: 'invalid-output',
    });

    const second = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-output'),
    );
    expect(second).toEqual({
      kind: ResultKind.Success,
      value: { reservationId: 'r-valid' },
    });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('does not store TransientFailure, so a repeated key runs the handler again', async () => {
    const { router } = setup();
    const handler = jest
      .fn<Promise<OperationResult<{ reservationId: string }>>, []>()
      .mockResolvedValueOnce({
        kind: ResultKind.TransientFailure,
        reason: 'db-down',
      })
      .mockResolvedValueOnce(success('r-2'));
    router.register(Reserve, handler);

    const first = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-3'),
    );
    const second = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-3'),
    );
    expect(first.kind).toBe(ResultKind.TransientFailure);
    expect(second).toEqual({
      kind: ResultKind.Success,
      value: { reservationId: 'r-2' },
    });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('rejects a reused key with a different input as ProtocolViolation idempotency-key-reuse', async () => {
    const { router } = setup();
    const handler = jest.fn(async () => success());
    router.register(Reserve, handler);

    await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-reuse'),
    );
    const reused = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 2 },
      meta('k-reuse'),
    );
    expect(reused).toEqual({
      kind: ResultKind.ProtocolViolation,
      reason: 'idempotency-key-reuse',
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('scopes idempotency by tenant', async () => {
    const { router } = setup();
    const handler = jest.fn(async () => success());
    router.register(Reserve, handler);

    await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('shared', { tenantId: 't-1' }),
    );
    await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('shared', { tenantId: 't-2' }),
    );
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('scopes idempotency by operation', async () => {
    const { router } = setup();
    const reserve = jest.fn(async () => success());
    const release = jest.fn(async () => ({
      kind: ResultKind.Success as const,
      value: { released: true },
    }));
    router.register(Reserve, reserve);
    router.register(Release, release);

    await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('shared'),
    );
    await router.handle(
      'stock.release.v1',
      { reservationId: 'r' },
      meta('shared'),
    );
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rejects work whose deadline has passed, without running the handler', async () => {
    const { router } = setup();
    const handler = jest.fn(async () => success());
    router.register(Reserve, handler);

    const result = await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta('k-late', { deadline: Date.now() - 1 }),
    );
    expect(result).toEqual({
      kind: ResultKind.TransientFailure,
      reason: 'deadline-exceeded',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes the parsed input and the call metadata to the handler', async () => {
    const { router } = setup();
    const handler = jest.fn(async () => success());
    router.register(Reserve, handler);
    const callMeta = meta('k-4', { tenantId: 't-1', timeoutMs: 100 });

    await router.handle(
      'stock.reserve.v1',
      { sku: 'A', qty: 2, extra: 'ignored' },
      callMeta,
    );
    expect(handler).toHaveBeenCalledWith({ sku: 'A', qty: 2 }, callMeta);
  });

  it('returns ProtocolViolation unknown-operation for an operation without a handler', async () => {
    const { router } = setup();
    await expect(
      router.handle('stock.nope.v1', {}, meta('k-5')),
    ).resolves.toEqual({
      kind: ResultKind.ProtocolViolation,
      reason: 'unknown-operation',
    });
  });
});

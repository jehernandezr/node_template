import { defineOperation, PlatformErrorCode } from '@contracts/platform';
import { DomainError } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import {
  CallOutcome,
  CallOutcomeKind,
  type CallOutcome as Outcome,
  type ClaimRequest,
} from '@platform/primitives';
import { z } from 'zod';
import {
  Compensation,
  INVALID_INPUT_CODE,
  Operation,
  OperationContract,
} from './contract.js';
import { InternalApiErrorCode } from './errors.js';
import { MAX_CALL_IDEMPOTENCY_KEY_LENGTH } from './limits.js';
import { ContractRegistry } from './registry.js';
import { InternalApiReason } from './result.js';
import { InternalRouter } from './router.js';
import { InMemoryProcessedOperationStore } from './store.js';
import type { CallMeta } from './transport.js';

const OUT_OF_STOCK = 'STOCK.RESERVE.OUT_OF_STOCK';

const Reserve = defineOperation({
  id: 'stock.reserve.v1',
  input: z.object({ sku: z.string(), qty: z.number().int().positive() }),
  output: z.object({ reservationId: z.string() }),
  idempotent: true,
  compensatedBy: 'stock.release.v1',
  errors: [OUT_OF_STOCK],
  description: 'Reserves stock.',
});

const Release = defineOperation({
  id: 'stock.release.v1',
  input: z.object({ reservationId: z.string() }),
  output: z.object({ released: z.boolean() }),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Idempotent release',
  description: 'Releases a reservation.',
});

const Count = defineOperation({
  id: 'stock.count.v1',
  input: z.object({ sku: z.string() }),
  output: z.object({ total: z.number() }),
  idempotent: true,
  mutating: false,
  description: 'Counts stock.',
});

@Operation({ id: 'stock.legacy-count.v1', mutating: false, idempotent: true })
class LegacyCount extends OperationContract<
  { sku: string },
  { total: number }
> {
  readonly input = z.object({ sku: z.string() });
  readonly output = z.object({ total: z.number() });
}

class Unannotated extends OperationContract<object, object> {
  readonly input = z.object({});
  readonly output = z.object({});
}

class OutOfStock extends DomainError {
  readonly code = OUT_OF_STOCK;
}

class Unexpected extends DomainError {
  readonly code = 'STOCK.RESERVE.SURPRISE';
}

type ReserveOutcome = Outcome<{ reservationId: string }>;

const success = (reservationId = 'r-1') =>
  CallOutcome.success({ reservationId });

function setup(options: { leaseMarginMs?: number } = {}) {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const processed = new InMemoryProcessedOperationStore(
    clock,
    new SequentialIdGenerator(),
  );
  const claim = jest.spyOn(processed, 'claim');
  const router = new InternalRouter({ processed, clock, ...options });
  const meta = (
    idempotencyKey: string,
    extra: Partial<CallMeta> = {},
  ): CallMeta => ({
    idempotencyKey,
    timeoutMs: 1000,
    deadline: clock.now().getTime() + 1000,
    ...extra,
  });
  return { router, processed, clock, claim, meta };
}

const input = { sku: 'A', qty: 1 };

describe('InternalRouter', () => {
  describe('registration', () => {
    it('assertComplete passes when every registered operation has a handler', () => {
      const { router } = setup();
      const registry = new ContractRegistry();
      registry.register(Reserve, Release);
      router.register(Reserve, async () => success());
      router.register(Release, async () =>
        CallOutcome.success({ released: true }),
      );
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
      expect(caught).toMatchObject({
        code: InternalApiErrorCode.MissingHandler,
      });
      expect((caught as Error).message).toContain('stock.release.v1');
      expect((caught as Error).message).toContain('stock.count.v1');
      expect((caught as Error).message).not.toContain('stock.reserve.v1');
    });

    it('rejects a second handler for the same operation with DuplicateOperation', () => {
      const { router } = setup();
      const handler = async () => CallOutcome.success({ total: 0 });
      router.register(Count, handler);
      expect(() => router.register(Count, handler)).toThrow(
        expect.objectContaining({
          code: InternalApiErrorCode.DuplicateOperation,
        }),
      );
    });

    it('rejects a class without @Operation with InvalidOperation', () => {
      const { router } = setup();
      expect(() =>
        router.register(Unannotated, async () => CallOutcome.success({})),
      ).toThrow(
        expect.objectContaining({
          code: InternalApiErrorCode.InvalidOperation,
        }),
      );
    });

    it('keeps serving a legacy @Operation class', async () => {
      const { router, meta } = setup();
      router.register(LegacyCount, async ({ sku }) =>
        CallOutcome.success({ total: sku.length }),
      );
      await expect(
        router.handle('stock.legacy-count.v1', { sku: 'AB' }, meta('k')),
      ).resolves.toEqual(CallOutcome.success({ total: 2 }));
    });
  });

  describe('validation', () => {
    it('returns INVALID_INPUT with field errors without running the handler or storing anything', async () => {
      const { router, claim, meta } = setup();
      const handler = jest.fn(async () => success());
      router.register(Reserve, handler);

      const result = await router.handle(
        'stock.reserve.v1',
        { sku: 'A', qty: -1 },
        meta('k-1'),
      );

      expect(result).toMatchObject({
        kind: CallOutcomeKind.BusinessError,
        code: INVALID_INPUT_CODE,
        details: {
          fieldErrors: [
            { field: 'qty', code: PlatformErrorCode.ValidationTooSmall },
          ],
        },
      });
      expect(handler).not.toHaveBeenCalled();
      expect(claim).not.toHaveBeenCalled();
    });

    it('returns a protocol violation for an unknown operation', async () => {
      const { router, meta } = setup();
      await expect(
        router.handle('stock.nope.v1', {}, meta('k-5')),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UnknownOperation,
          InternalApiErrorCode.UnknownOperation,
        ),
      );
    });

    it('rejects an input larger than the payload limit before parsing it', async () => {
      const clock = new FixedClock();
      const router = new InternalRouter({
        processed: new InMemoryProcessedOperationStore(clock),
        clock,
        maxPayloadBytes: 32,
      });
      const handler = jest.fn(async () => success());
      router.register(Reserve, handler);

      const result = await router.handle(
        'stock.reserve.v1',
        { sku: 'A'.repeat(100), qty: 1 },
        {
          idempotencyKey: 'k',
          timeoutMs: 1000,
          deadline: clock.now().getTime() + 1000,
        },
      );

      expect(result).toMatchObject({
        code: InternalApiErrorCode.PayloadTooLarge,
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it.each([
      ['an empty key', ''],
      ['an oversized key', 'k'.repeat(MAX_CALL_IDEMPOTENCY_KEY_LENGTH + 1)],
    ])('rejects %s as a protocol violation', async (_label, key) => {
      const { router, meta } = setup();
      const handler = jest.fn(async () => success());
      router.register(Reserve, handler);

      await expect(
        router.handle('stock.reserve.v1', input, meta(key)),
      ).resolves.toMatchObject({
        kind: CallOutcomeKind.ProtocolViolation,
        code: InternalApiErrorCode.InvalidIdempotencyKey,
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('rejects work whose deadline has passed, without running the handler', async () => {
      const { router, clock, meta } = setup();
      const handler = jest.fn(async () => success());
      router.register(Reserve, handler);

      const result = await router.handle(
        'stock.reserve.v1',
        input,
        meta('k-late', { deadline: clock.now().getTime() - 1 }),
      );

      expect(result).toEqual(
        CallOutcome.transientFailure(InternalApiReason.DeadlineExceeded),
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it('rejects a deadline that is not a finite epoch as a protocol violation', async () => {
      const { router, meta } = setup();
      router.register(Reserve, async () => success());

      await expect(
        router.handle('stock.reserve.v1', input, meta('k', { deadline: NaN })),
      ).resolves.toMatchObject({ kind: CallOutcomeKind.ProtocolViolation });
    });

    it('passes the parsed input and the call metadata to the handler', async () => {
      const { router, meta } = setup();
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
  });

  describe('idempotency', () => {
    it('runs the handler once for the same key and replays the stored result', async () => {
      const { router, meta } = setup();
      const handler = jest.fn(async () => success());
      router.register(Reserve, handler);

      const first = await router.handle('stock.reserve.v1', input, meta('k-1'));
      const second = await router.handle(
        'stock.reserve.v1',
        input,
        meta('k-1'),
      );

      expect(first).toEqual(success());
      expect(second).toEqual(first);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('treats the same input with a different key order as the same call', async () => {
      const { router, meta } = setup();
      const handler = jest.fn(async () => success());
      router.register(Reserve, handler);

      await router.handle('stock.reserve.v1', { sku: 'A', qty: 1 }, meta('k'));
      await router.handle('stock.reserve.v1', { qty: 1, sku: 'A' }, meta('k'));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('claims the key as a canonical JSON array of tenant, operation and key', async () => {
      const { router, claim, meta } = setup();
      router.register(Reserve, async () => success());

      await router.handle(
        'stock.reserve.v1',
        input,
        meta('k|1', { tenantId: 't|1' }),
      );
      await router.handle('stock.reserve.v1', input, meta('k-2'));

      expect(claim.mock.calls.map(([key]) => key)).toEqual([
        '["t|1","stock.reserve.v1","k|1"]',
        '[null,"stock.reserve.v1","k-2"]',
      ]);
    });

    it('derives the lease from the request deadline plus the margin', async () => {
      const { router, claim, meta, clock } = setup({ leaseMarginMs: 250 });
      router.register(Reserve, async () => success());
      const deadline = clock.now().getTime() + 1000;

      await router.handle('stock.reserve.v1', input, meta('k', { deadline }));

      const request = claim.mock.calls[0]?.[1] as ClaimRequest;
      expect(request.deadline.atMs).toBe(deadline);
      expect(request.leaseMarginMs).toBe(250);
    });

    it('concurrent calls on one key run the handler once; the second gets in-progress', async () => {
      const { router, meta } = setup();
      let finish!: () => void;
      const gate = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const handler = jest.fn(async () => {
        await gate;
        return success();
      });
      router.register(Reserve, handler);

      const first = router.handle('stock.reserve.v1', input, meta('k'));
      const second = await router.handle('stock.reserve.v1', input, meta('k'));
      expect(second).toEqual(
        CallOutcome.transientFailure(InternalApiReason.InProgress),
      );

      finish();
      await expect(first).resolves.toEqual(success());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('fences a slow attempt whose lease was taken over: its result is uncertain and not stored', async () => {
      const { router, meta, clock } = setup({ leaseMarginMs: 100 });
      let finishSlow!: () => void;
      const gate = new Promise<void>((resolve) => {
        finishSlow = resolve;
      });
      const handler = jest
        .fn<Promise<ReserveOutcome>, []>()
        .mockImplementationOnce(async () => {
          await gate;
          return success('r-slow');
        })
        .mockResolvedValueOnce(success('r-fast'));
      router.register(Reserve, handler);

      const slow = router.handle('stock.reserve.v1', input, meta('k'));
      clock.advance(1_101);
      const fast = await router.handle('stock.reserve.v1', input, meta('k'));
      finishSlow();

      expect(fast).toEqual(success('r-fast'));
      await expect(slow).resolves.toEqual({
        kind: CallOutcomeKind.Uncertain,
        reason: InternalApiReason.StaleClaim,
        cause: expect.objectContaining({
          code: 'PLATFORM.PRIMITIVES.STALE_CLAIM',
        }),
      });
      await expect(
        router.handle('stock.reserve.v1', input, meta('k')),
      ).resolves.toEqual(success('r-fast'));
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('rejects a reused key with a different input as a protocol violation', async () => {
      const { router, meta } = setup();
      const handler = jest.fn(async () => success());
      router.register(Reserve, handler);

      await router.handle('stock.reserve.v1', input, meta('k-reuse'));
      const reused = await router.handle(
        'stock.reserve.v1',
        { sku: 'A', qty: 2 },
        meta('k-reuse'),
      );

      expect(reused).toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.IdempotencyKeyReuse,
          InternalApiErrorCode.IdempotencyKeyReuse,
        ),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('scopes idempotency by tenant', async () => {
      const { router, meta } = setup();
      const handler = jest.fn(async () => success());
      router.register(Reserve, handler);

      await router.handle(
        'stock.reserve.v1',
        input,
        meta('shared', { tenantId: 't-1' }),
      );
      await router.handle(
        'stock.reserve.v1',
        input,
        meta('shared', { tenantId: 't-2' }),
      );
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('scopes idempotency by operation', async () => {
      const { router, meta } = setup();
      const reserve = jest.fn(async () => success());
      const release = jest.fn(async () =>
        CallOutcome.success({ released: true }),
      );
      router.register(Reserve, reserve);
      router.register(Release, release);

      await router.handle('stock.reserve.v1', input, meta('shared'));
      await router.handle(
        'stock.release.v1',
        { reservationId: 'r' },
        meta('shared'),
      );
      expect(reserve).toHaveBeenCalledTimes(1);
      expect(release).toHaveBeenCalledTimes(1);
    });
  });

  describe('handler outcomes', () => {
    it('stores a declared business error and replays it', async () => {
      const { router, meta } = setup();
      const handler = jest.fn(async () =>
        CallOutcome.businessError(OUT_OF_STOCK),
      );
      router.register(Reserve, handler);

      const first = await router.handle('stock.reserve.v1', input, meta('k'));
      const second = await router.handle('stock.reserve.v1', input, meta('k'));

      expect(first).toEqual(CallOutcome.businessError(OUT_OF_STOCK));
      expect(second).toEqual(first);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns an undeclared business code as a protocol violation, does not store it and releases the claim', async () => {
      const { router, meta } = setup();
      const handler = jest.fn(async () =>
        CallOutcome.businessError('SURPRISE'),
      );
      router.register(Reserve, handler);

      const first = await router.handle('stock.reserve.v1', input, meta('k'));
      await router.handle('stock.reserve.v1', input, meta('k'));

      expect(first).toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UndeclaredError,
          'SURPRISE',
        ),
      );
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('treats a database outage thrown by the handler as transient, not stored, claim released', async () => {
      const { router, meta } = setup();
      const outage = Object.assign(new Error('terminating connection'), {
        code: '57P01',
      });
      const handler = jest
        .fn<Promise<ReserveOutcome>, []>()
        .mockRejectedValueOnce(outage)
        .mockResolvedValueOnce(success('r-after'));
      router.register(Reserve, handler);

      const first = await router.handle('stock.reserve.v1', input, meta('k'));
      const second = await router.handle('stock.reserve.v1', input, meta('k'));

      expect(first).toMatchObject({
        kind: CallOutcomeKind.TransientFailure,
        reason: '57P01',
      });
      expect(second).toEqual(success('r-after'));
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('turns a thrown declared domain error into a stored business error', async () => {
      const { router, meta } = setup();
      const handler = jest.fn(async (): Promise<ReserveOutcome> => {
        throw new OutOfStock('No stock left', { sku: 'A' });
      });
      router.register(Reserve, handler);

      const first = await router.handle('stock.reserve.v1', input, meta('k'));
      const second = await router.handle('stock.reserve.v1', input, meta('k'));

      expect(first).toEqual({
        kind: CallOutcomeKind.BusinessError,
        code: OUT_OF_STOCK,
        message: 'No stock left',
        details: { sku: 'A' },
      });
      expect(second).toEqual(first);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('turns a thrown undeclared domain error into a protocol violation', async () => {
      const { router, meta } = setup();
      router.register(Reserve, async () => {
        throw new Unexpected('surprise');
      });

      await expect(
        router.handle('stock.reserve.v1', input, meta('k')),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UndeclaredError,
          'STOCK.RESERVE.SURPRISE',
        ),
      );
    });

    it('turns an unknown thrown error into a protocol violation, not stored, claim released', async () => {
      const { router, meta } = setup();
      const handler = jest
        .fn<Promise<ReserveOutcome>, []>()
        .mockRejectedValueOnce(new TypeError('x is undefined'))
        .mockResolvedValueOnce(success('r-after'));
      router.register(Reserve, handler);

      const first = await router.handle('stock.reserve.v1', input, meta('k'));
      const second = await router.handle('stock.reserve.v1', input, meta('k'));

      expect(first).toEqual(CallOutcome.protocolViolation('TypeError'));
      expect(second).toEqual(success('r-after'));
    });

    it('turns a handler timeout into an uncertain outcome', async () => {
      const { router, meta } = setup();
      const timeout = Object.assign(new Error('took too long'), {
        name: 'TimeoutError',
      });
      router.register(Reserve, async () => {
        throw timeout;
      });

      await expect(
        router.handle('stock.reserve.v1', input, meta('k')),
      ).resolves.toMatchObject({ kind: CallOutcomeKind.Uncertain });
    });

    it('validates handler success output: invalid output is a protocol violation and not stored', async () => {
      const { router, meta } = setup();
      const handler = jest
        .fn<Promise<ReserveOutcome>, []>()
        .mockResolvedValueOnce(
          CallOutcome.success({ wrong: 1 }) as unknown as ReserveOutcome,
        )
        .mockResolvedValueOnce(success('r-valid'));
      router.register(Reserve, handler);

      const first = await router.handle('stock.reserve.v1', input, meta('k'));
      const second = await router.handle('stock.reserve.v1', input, meta('k'));

      expect(first).toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.InvalidOutput,
          InternalApiErrorCode.InvalidOutput,
        ),
      );
      expect(second).toEqual(success('r-valid'));
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('rejects a handler result that is not a CallOutcome', async () => {
      const { router, meta } = setup();
      router.register(
        Reserve,
        async () => ({ ok: true }) as unknown as ReserveOutcome,
      );

      await expect(
        router.handle('stock.reserve.v1', input, meta('k')),
      ).resolves.toMatchObject({
        code: InternalApiErrorCode.InvalidHandlerResult,
      });
    });

    it('does not store a transient failure, so a repeated key runs the handler again', async () => {
      const { router, meta } = setup();
      const handler = jest
        .fn<Promise<ReserveOutcome>, []>()
        .mockResolvedValueOnce(CallOutcome.transientFailure('db-down'))
        .mockResolvedValueOnce(success('r-2'));
      router.register(Reserve, handler);

      const first = await router.handle('stock.reserve.v1', input, meta('k'));
      const second = await router.handle('stock.reserve.v1', input, meta('k'));

      expect(first.kind).toBe(CallOutcomeKind.TransientFailure);
      expect(second).toEqual(success('r-2'));
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});

import { OperationResolver } from '../../contract/operation-resolver.js';
import { JsonSafetyChecker } from '../../contract/json-safety-checker.js';
import { defineOperation, type OperationDefinition } from '@contracts/platform';
import { context as otelContext } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { CallOutcome } from '@platform/primitives';
import { TraceContextCodec } from '@platform/observability';
import { z } from 'zod';
import { ContractRegistry } from '../../contract/contract-registry.js';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { TraceCapturingHandler } from './utils/trace-capturing-handler.js';
import { ScriptedHandler } from './utils/scripted-handler.js';
import { ServerHarness } from './utils/server-harness.js';

const REGISTRY_COLLABORATORS = {
  resolver: new OperationResolver(),
  jsonSafety: new JsonSafetyChecker(),
};

const Reserve = defineOperation({
  id: 'stock.reserve.v1',
  input: z.object({ sku: z.string(), qty: z.number().int().positive() }),
  output: z.object({ reservationId: z.string() }),
  idempotent: true,
  compensatedBy: 'stock.release.v1',
  errors: [ServerHarness.OUT_OF_STOCK],
  description: 'Reserves stock.',
});

const Release = defineOperation({
  id: 'stock.release.v1',
  input: z.object({ reservationId: z.string() }),
  output: z.object({ released: z.boolean() }),
  idempotent: true,
  compensatedBy: 'stock.reserve.v1',
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

const input = { sku: 'A', qty: 1 };
const success = (reservationId = 'r-1') =>
  CallOutcome.success({ reservationId });

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const TRACEPARENT = `00-${TRACE_ID}-00f067aa0ba902b7-01`;

describe('InternalRouter', () => {
  describe('registration', () => {
    it('assertComplete, every registered operation has a handler, passes', () => {
      const harness = new ServerHarness();
      const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
      registry.register(Reserve, Release);
      harness.router.register(Reserve, new ScriptedHandler<typeof Reserve>());
      harness.router.register(Release, new ScriptedHandler<typeof Release>());

      expect(() => harness.router.assertComplete(registry)).not.toThrow();
    });

    it('assertComplete, operations without handler, throws MissingHandler naming only those', () => {
      const harness = new ServerHarness();
      const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
      registry.register(Reserve, Release, Count);
      harness.router.register(Reserve, new ScriptedHandler<typeof Reserve>());

      expect(() => harness.router.assertComplete(registry)).toThrow(
        expect.objectContaining({
          code: InternalApiErrorCode.MissingHandler,
          message: 'Missing handlers for: stock.release.v1, stock.count.v1',
        }),
      );
    });

    it('register, operation already has a handler, throws DuplicateOperation', () => {
      const harness = new ServerHarness();
      harness.router.register(Count, new ScriptedHandler<typeof Count>());

      expect(() =>
        harness.router.register(Count, new ScriptedHandler<typeof Count>()),
      ).toThrow(
        expect.objectContaining({
          code: InternalApiErrorCode.DuplicateOperation,
        }),
      );
    });

    it('register, value that is not a descriptor, throws InvalidOperation', () => {
      const harness = new ServerHarness();
      const plain = { id: 'stock.plain.v1' } as OperationDefinition;

      expect(() =>
        harness.router.register(plain, new ScriptedHandler<typeof Reserve>()),
      ).toThrow(
        expect.objectContaining({
          code: InternalApiErrorCode.InvalidOperation,
        }),
      );
    });
  });

  describe('handle', () => {
    it('handle, unknown operation, answers unknown-operation', async () => {
      const harness = new ServerHarness();

      await expect(
        harness.router.handle('stock.nope.v1', {}, harness.meta('k')),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UnknownOperation,
          InternalApiErrorCode.UnknownOperation,
        ),
      );
    });

    it('handle, parsed input and call metadata, reach the handler', async () => {
      const harness = new ServerHarness();
      const handler = new ScriptedHandler<typeof Reserve>().thenReturn({
        outcome: success(),
      });
      harness.router.register(Reserve, handler);
      const meta = harness.meta('k', { tenantId: 't-1', timeoutMs: 100 });

      await harness.router.handle(
        'stock.reserve.v1',
        { sku: 'A', qty: 2, extra: 'ignored' },
        meta,
      );

      expect(handler.inputs).toEqual([{ sku: 'A', qty: 2 }]);
      expect(handler.contexts).toEqual([
        { ...meta, signal: expect.any(AbortSignal) },
      ]);
    });

    it('handle, handler outcome, returns the outcome of the dispatcher', async () => {
      const harness = new ServerHarness();
      harness.router.register(
        Reserve,
        new ScriptedHandler<typeof Reserve>().thenReturn({
          outcome: CallOutcome.businessError(ServerHarness.OUT_OF_STOCK),
        }),
      );

      await expect(
        harness.router.handle('stock.reserve.v1', input, harness.meta('k')),
      ).resolves.toEqual(CallOutcome.businessError(ServerHarness.OUT_OF_STOCK));
    });
  });

  describe('trace propagation', () => {
    const manager = new AsyncLocalStorageContextManager();

    beforeAll(() => {
      otelContext.setGlobalContextManager(manager.enable());
    });

    afterAll(() => {
      otelContext.disable();
    });

    it('handle, valid traceparent, runs the handler in the same trace', async () => {
      const harness = new ServerHarness();
      const handler = new TraceCapturingHandler<typeof Reserve>(
        harness.restorer,
        success(),
      );
      harness.router.register(Reserve, handler);

      await harness.router.handle(
        'stock.reserve.v1',
        input,
        harness.meta('k', { traceparent: TRACEPARENT }),
      );

      expect(TraceContextCodec.parseTraceparent(handler.seen)?.traceId).toBe(
        TRACE_ID,
      );
    });

    it('handle, no traceparent, runs the handler without a trace', async () => {
      const harness = new ServerHarness();
      const handler = new TraceCapturingHandler<typeof Reserve>(
        harness.restorer,
        success(),
      );
      harness.router.register(Reserve, handler);

      await harness.router.handle('stock.reserve.v1', input, harness.meta('k'));

      expect(handler.seen).toBeUndefined();
    });

    it('handle, invalid traceparent, ignores it', async () => {
      const harness = new ServerHarness();
      const handler = new TraceCapturingHandler<typeof Reserve>(
        harness.restorer,
        success(),
      );
      harness.router.register(Reserve, handler);

      await harness.router.handle(
        'stock.reserve.v1',
        input,
        harness.meta('k', { traceparent: 'garbage' }),
      );

      expect(handler.seen).toBeUndefined();
    });
  });
});

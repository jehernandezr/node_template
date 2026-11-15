import {
  Compensation,
  defineOperation,
  PlatformErrorCode,
  type OperationDefinition,
} from '@contracts/platform';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  CallOutcome,
  CallOutcomeKind,
  CanonicalJson,
} from '@platform/primitives';
import { z } from 'zod';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { OperationMetadata } from '../../contract/operation-metadata.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import type { CallMeta } from '../../transport/call-meta.js';
import { OperationRoute } from '../operation-route.js';
import { ScriptedHandler } from './utils/scripted-handler.js';
import { RecordingProcessedOperationStore } from './utils/recording-processed-operation-store.js';
import { ServerHarness } from './utils/server-harness.js';

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
  compensatedBy: Compensation.None,
  compensationReason: 'Idempotent release',
  description: 'Releases a reservation.',
});

const input = { sku: 'A', qty: 1 };
const success = (reservationId = 'r-1') =>
  CallOutcome.success({ reservationId });

function routeFor(
  harness: ServerHarness,
  handler: ScriptedHandler,
  operation: OperationDefinition = Reserve,
): OperationRoute {
  return OperationRoute.bind(harness.resolver.resolve(operation), handler);
}

const invalidKey = CallOutcome.protocolViolation(
  InternalApiReason.InvalidIdempotencyKey,
  InternalApiErrorCode.InvalidIdempotencyKey,
);

describe('OperationDispatcher', () => {
  it('dispatch, input above the payload limit, rejects without running or claiming', async () => {
    const harness = new ServerHarness({ maxPayloadBytes: 64 });
    const handler = new ScriptedHandler().thenReturn({ outcome: success() });
    const route = routeFor(harness, handler);

    const outcome = await harness.dispatcher.dispatch(
      route,
      { sku: 'A'.repeat(100), qty: 1 },
      harness.meta('k'),
    );

    expect(outcome).toEqual(
      CallOutcome.protocolViolation(
        InternalApiReason.PayloadTooLarge,
        InternalApiErrorCode.PayloadTooLarge,
      ),
    );
    expect(handler.calls).toBe(0);
  });

  it.each([
    ['an empty key', { idempotencyKey: '' }],
    ['an oversized key', { idempotencyKey: 'k'.repeat(257) }],
    ['an empty tenant', { tenantId: '' }],
    ['an oversized tenant', { tenantId: 't'.repeat(129) }],
  ])(
    'dispatch, %s, answers invalid-idempotency-key without running the handler',
    async (_label, overrides) => {
      const harness = new ServerHarness();
      const handler = new ScriptedHandler().thenReturn({ outcome: success() });

      const outcome = await harness.dispatcher.dispatch(
        routeFor(harness, handler),
        input,
        harness.meta('k', overrides),
      );

      expect(outcome).toEqual(invalidKey);
      expect(handler.calls).toBe(0);
    },
  );

  it('dispatch, input that breaks the contract, answers invalid-input with field errors and does not claim', async () => {
    const store = new RecordingProcessedOperationStore(
      new FixedClock(),
      new SequentialIdGenerator(),
    );
    const harness = new ServerHarness({ store });
    const handler = new ScriptedHandler().thenReturn({ outcome: success() });

    const outcome = await harness.dispatcher.dispatch(
      routeFor(harness, handler),
      { sku: 'A', qty: -1 },
      harness.meta('k'),
    );

    expect(outcome).toMatchObject({
      kind: CallOutcomeKind.BusinessError,
      code: OperationMetadata.INVALID_INPUT_CODE,
      details: {
        fieldErrors: [
          { field: 'qty', code: PlatformErrorCode.ValidationTooSmall },
        ],
      },
    });
    expect(store.claims).toEqual([]);
    expect(handler.calls).toBe(0);
  });

  it('dispatch, deadline already passed, answers deadline-exceeded without running the handler', async () => {
    const harness = new ServerHarness();
    const handler = new ScriptedHandler().thenReturn({ outcome: success() });

    const outcome = await harness.dispatcher.dispatch(
      routeFor(harness, handler),
      input,
      harness.meta('k', { deadline: harness.clock.now().getTime() - 1 }),
    );

    expect(outcome).toEqual(
      CallOutcome.transientFailure(InternalApiReason.DeadlineExceeded),
    );
    expect(handler.calls).toBe(0);
  });

  it('dispatch, deadline that is not a finite epoch, answers protocol-violation', async () => {
    const harness = new ServerHarness();

    const outcome = await harness.dispatcher.dispatch(
      routeFor(harness, new ScriptedHandler()),
      input,
      harness.meta('k', { deadline: Number.NaN }),
    );

    expect(outcome).toMatchObject({
      kind: CallOutcomeKind.ProtocolViolation,
    });
  });

  it('dispatch, store key that does not fit the store, answers invalid-idempotency-key', async () => {
    const harness = new ServerHarness();
    const handler = new ScriptedHandler().thenReturn({ outcome: success() });

    const outcome = await harness.dispatcher.dispatch(
      routeFor(harness, handler),
      input,
      harness.meta('"'.repeat(256), { tenantId: 't'.repeat(128) }),
    );

    expect(outcome).toEqual(invalidKey);
    expect(handler.calls).toBe(0);
  });

  it('dispatch, a call, claims the key as the canonical JSON of tenant, operation and key', async () => {
    const store = new RecordingProcessedOperationStore(
      new FixedClock(),
      new SequentialIdGenerator(),
    );
    const harness = new ServerHarness({ store });
    const handler = new ScriptedHandler().thenReturn({ outcome: success() });

    await harness.dispatcher.dispatch(
      routeFor(harness, handler),
      input,
      harness.meta('k', { tenantId: 't-1' }),
    );

    expect(store.claims[0]?.key).toBe(
      CanonicalJson.stringify(['t-1', 'stock.reserve.v1', 'k']),
    );
  });

  it('dispatch, same input with another key order, is the same call and runs the handler once', async () => {
    const harness = new ServerHarness();
    const handler = new ScriptedHandler().thenReturn({ outcome: success() });
    const route = routeFor(harness, handler);

    await harness.dispatcher.dispatch(
      route,
      { sku: 'A', qty: 1 },
      harness.meta('k'),
    );
    await harness.dispatcher.dispatch(
      route,
      { qty: 1, sku: 'A' },
      harness.meta('k'),
    );

    expect(handler.calls).toBe(1);
  });

  it('dispatch, repeated call, replays the stored result', async () => {
    const harness = new ServerHarness();
    const handler = new ScriptedHandler().thenReturn({
      outcome: success('r-7'),
    });
    const route = routeFor(harness, handler);

    const first = await harness.dispatcher.dispatch(
      route,
      input,
      harness.meta('k'),
    );
    const second = await harness.dispatcher.dispatch(
      route,
      input,
      harness.meta('k'),
    );

    expect(second).toEqual(first);
    expect(handler.calls).toBe(1);
  });

  it('dispatch, same key with another input, answers idempotency-key-reuse', async () => {
    const harness = new ServerHarness();
    const handler = new ScriptedHandler().thenReturn({ outcome: success() });
    const route = routeFor(harness, handler);
    await harness.dispatcher.dispatch(route, input, harness.meta('k-reuse'));

    const reused = await harness.dispatcher.dispatch(
      route,
      { sku: 'A', qty: 2 },
      harness.meta('k-reuse'),
    );

    expect(reused).toEqual(
      CallOutcome.protocolViolation(
        InternalApiReason.IdempotencyKeyReuse,
        InternalApiErrorCode.IdempotencyKeyReuse,
      ),
    );
    expect(handler.calls).toBe(1);
  });

  it('dispatch, same key in another tenant, runs the handler again', async () => {
    const harness = new ServerHarness();
    const handler = new ScriptedHandler().thenReturn({ outcome: success() });
    const route = routeFor(harness, handler);

    await harness.dispatcher.dispatch(
      route,
      input,
      harness.meta('shared', { tenantId: 't-1' }),
    );
    await harness.dispatcher.dispatch(
      route,
      input,
      harness.meta('shared', { tenantId: 't-2' }),
    );

    expect(handler.calls).toBe(2);
  });

  it('dispatch, same key in another operation, runs that operation too', async () => {
    const harness = new ServerHarness();
    const reserve = new ScriptedHandler().thenReturn({ outcome: success() });
    const release = new ScriptedHandler().thenReturn({
      outcome: CallOutcome.success({ released: true }),
    });

    await harness.dispatcher.dispatch(
      routeFor(harness, reserve),
      input,
      harness.meta('shared'),
    );
    await harness.dispatcher.dispatch(
      routeFor(harness, release, Release),
      { reservationId: 'r' },
      harness.meta('shared'),
    );

    expect(reserve.calls).toBe(1);
    expect(release.calls).toBe(1);
  });

  it('dispatch, concurrent call on a key in progress, answers in-progress and runs the handler once', async () => {
    const harness = new ServerHarness();
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const handler = new ScriptedHandler().thenReturn(
      { outcome: success() },
      gate,
    );
    const route = routeFor(harness, handler);

    const first = harness.dispatcher.dispatch(route, input, harness.meta('k'));
    await harness.settle();
    const second = await harness.dispatcher.dispatch(
      route,
      input,
      harness.meta('k'),
    );

    expect(second).toEqual(
      CallOutcome.transientFailure(InternalApiReason.InProgress),
    );
    finish();
    await expect(first).resolves.toEqual(success());
    expect(handler.calls).toBe(1);
  });

  it('dispatch, a call, takes a lease ending at the request deadline plus the margin', async () => {
    const clock = new FixedClock();
    const store = new RecordingProcessedOperationStore(
      clock,
      new SequentialIdGenerator(),
    );
    const harness = new ServerHarness({ clock, store, leaseMarginMs: 250 });
    const handler = new ScriptedHandler().thenReturn({ outcome: success() });
    const meta: CallMeta = harness.meta('k');

    await harness.dispatcher.dispatch(routeFor(harness, handler), input, meta);

    expect(store.claims[0]?.request).toMatchObject({
      deadline: { atMs: meta.deadline },
      leaseMarginMs: 250,
    });
  });
});

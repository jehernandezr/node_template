import { defineOperation, PlatformErrorCode } from '@contracts/platform';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import { CallOutcome, CallOutcomeKind, Deadline } from '@platform/primitives';
import { z } from 'zod';
import { Compensation } from '../contract.js';
import { InternalClient } from '../client.js';
import { InProcessTransport } from '../in-process-transport.js';
import { ContractRegistry } from '../registry.js';
import { InternalRouter } from '../router.js';
import { InMemoryProcessedOperationStore } from '../store.js';

const Quote = defineOperation({
  id: 'shipping.quote.v1',
  description: 'Quotes a shipment',
  mutating: false,
  idempotent: true,
  errors: ['SHIPPING.ROUTE.NOT_FOUND'],
  timeoutMs: 1000,
  input: z.object({ from: z.string(), to: z.string() }),
  output: z.object({ price: z.number() }),
});

const Book = defineOperation({
  id: 'shipping.book.v1',
  description: 'Books a shipment',
  compensatedBy: 'shipping.cancel.v1',
  idempotent: true,
  errors: ['SHIPPING.BOOKING.CLOSED'],
  input: z.object({ from: z.string(), to: z.string() }),
  output: z.object({ bookingId: z.string() }),
});

const Cancel = defineOperation({
  id: 'shipping.cancel.v1',
  description: 'Cancels a booking',
  compensatedBy: Compensation.None,
  compensationReason: 'Cancel is itself final',
  idempotent: true,
  input: z.object({ bookingId: z.string() }),
  output: z.object({ cancelled: z.boolean() }),
});

const SlowQuote = defineOperation({
  id: 'shipping.slow-quote.v1',
  description: 'Quotes slowly',
  mutating: false,
  idempotent: true,
  timeoutMs: 5,
  input: z.object({ from: z.string() }),
  output: z.object({ price: z.number() }),
});

const Label = defineOperation({
  id: 'shipping.label.v1',
  description: 'Prints a label',
  compensatedBy: Compensation.None,
  compensationReason: 'Labels are not reversible',
  idempotent: false,
  retry: { maxAttempts: 4, baseMs: 1, maxMs: 1 },
  input: z.object({ bookingId: z.string() }),
  output: z.object({ url: z.string() }),
});

function build() {
  const registry = new ContractRegistry();
  registry.register(Quote, Book, Cancel, Label, SlowQuote);
  const router = new InternalRouter({
    processed: new InMemoryProcessedOperationStore(),
  });
  const client = new InternalClient({
    transport: new InProcessTransport(router),
    registry,
    sleep: async () => undefined,
    random: () => 0,
  });
  return { registry, router, client };
}

describe('client -> InProcessTransport -> router', () => {
  it('completes a registry-valid round trip with validated output', () => {
    const { registry, router } = build();
    expect(registry.validate()).toEqual([]);
    router.register(Quote, async (input) => ({
      kind: CallOutcomeKind.Success,
      value: { price: input.from.length + input.to.length },
    }));
    router.register(Book, async () => ({
      kind: CallOutcomeKind.Success,
      value: { bookingId: 'b-1' },
    }));
    router.register(Cancel, async () => ({
      kind: CallOutcomeKind.Success,
      value: { cancelled: true },
    }));
    router.register(Label, async () => ({
      kind: CallOutcomeKind.Success,
      value: { url: 'https://labels.example/1' },
    }));
    router.register(SlowQuote, async () => ({
      kind: CallOutcomeKind.Success,
      value: { price: 1 },
    }));
    expect(() => router.assertComplete(registry)).not.toThrow();
  });

  it('returns the server success value through the client', async () => {
    const { router, client } = build();
    router.register(Quote, async (input) => ({
      kind: CallOutcomeKind.Success,
      value: { price: input.from.length + input.to.length },
    }));

    await expect(
      client.call(Quote, { from: 'BOG', to: 'MDE' }, { idempotencyKey: 'q-1' }),
    ).resolves.toEqual({
      kind: CallOutcomeKind.Success,
      value: { price: 6 },
    });
  });

  it('returns a declared business error from the server to the caller', async () => {
    const { router, client } = build();
    router.register(Book, async () => ({
      kind: CallOutcomeKind.BusinessError,
      code: 'SHIPPING.BOOKING.CLOSED',
      message: 'Route closed',
    }));

    await expect(
      client.call(Book, { from: 'BOG', to: 'MDE' }, { idempotencyKey: 'b-1' }),
    ).resolves.toEqual({
      kind: CallOutcomeKind.BusinessError,
      code: 'SHIPPING.BOOKING.CLOSED',
      message: 'Route closed',
    });
  });

  it('retries a transient server failure with the same key, and the handler result is then stored once', async () => {
    const { router, client } = build();
    let calls = 0;
    router.register(Quote, async () => {
      calls++;
      if (calls === 1) {
        return { kind: CallOutcomeKind.TransientFailure, reason: 'db-timeout' };
      }
      return { kind: CallOutcomeKind.Success, value: { price: 42 } };
    });

    await expect(
      client.call(Quote, { from: 'A', to: 'B' }, { idempotencyKey: 'q-2' }),
    ).resolves.toEqual({
      kind: CallOutcomeKind.Success,
      value: { price: 42 },
    });
    expect(calls).toBe(2);

    await client.call(Quote, { from: 'A', to: 'B' }, { idempotencyKey: 'q-2' });
    expect(calls).toBe(2);
  });

  it('does not retry a non-idempotent operation on transient failure', async () => {
    const { router, client } = build();
    const handler = jest.fn(async () => ({
      kind: CallOutcomeKind.TransientFailure as const,
      reason: 'busy',
    }));
    router.register(Label, handler);

    await expect(
      client.call(Label, { bookingId: 'b-1' }, { idempotencyKey: 'l-1' }),
    ).resolves.toEqual({
      kind: CallOutcomeKind.TransientFailure,
      reason: 'busy',
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('turns an undeclared server business error into ProtocolViolation on the client, not stored', async () => {
    const { router, client } = build();
    const handler = jest.fn(async () => ({
      kind: CallOutcomeKind.BusinessError as const,
      code: 'NOT_IN_CONTRACT',
    }));
    router.register(Book, handler);

    await expect(
      client.call(Book, { from: 'A', to: 'B' }, { idempotencyKey: 'b-2' }),
    ).resolves.toEqual({
      kind: CallOutcomeKind.ProtocolViolation,
      reason: 'undeclared-error',
      code: 'NOT_IN_CONTRACT',
    });
    await client.call(Book, { from: 'A', to: 'B' }, { idempotencyKey: 'b-2' });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('reports an unknown handler throw as a protocol violation and does not retry it', async () => {
    const { router, client } = build();
    const handler = jest.fn(async (): Promise<never> => {
      throw new Error('boom');
    });
    router.register(Quote, handler);

    await expect(
      client.call(Quote, { from: 'A', to: 'B' }, { idempotencyKey: 'q-throw' }),
    ).resolves.toEqual({
      kind: CallOutcomeKind.ProtocolViolation,
      reason: 'Error',
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('retries after a timeout while the handler is still running, without running it twice', async () => {
    const { router, client } = build();
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const handler = jest.fn(async () => {
      await gate;
      return { kind: CallOutcomeKind.Success as const, value: { price: 9 } };
    });
    router.register(SlowQuote, handler);

    await expect(
      client.call(SlowQuote, { from: 'A' }, { idempotencyKey: 'sq-1' }),
    ).resolves.toEqual({
      kind: CallOutcomeKind.TransientFailure,
      reason: 'in-progress',
    });
    expect(handler).toHaveBeenCalledTimes(1);

    finish();
    await expect(
      client.call(SlowQuote, { from: 'A' }, { idempotencyKey: 'sq-1' }),
    ).resolves.toEqual({
      kind: CallOutcomeKind.Success,
      value: { price: 9 },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports a server output that does not match the contract as ProtocolViolation invalid-output', async () => {
    const { router, client } = build();
    router.register(
      Book,
      async () =>
        ({
          kind: CallOutcomeKind.Success,
          value: { wrong: 1 },
        }) as unknown as CallOutcome<{ bookingId: string }>,
    );

    await expect(
      client.call(Book, { from: 'A', to: 'B' }, { idempotencyKey: 'b-3' }),
    ).resolves.toEqual({
      kind: CallOutcomeKind.ProtocolViolation,
      reason: 'invalid-output',
      code: PlatformErrorCode.InternalApiInvalidOutput,
    });
  });
});

describe('defineOperation end to end', () => {
  const Transfer = defineOperation({
    id: 'wallet.transfer.v1',
    input: z.object({ amount: z.number().int().positive() }),
    output: z.object({ transferId: z.string() }),
    idempotent: true,
    compensatedBy: 'wallet.revert.v1',
    errors: ['WALLET.TRANSFER.NO_FUNDS'],
    timeoutMs: 2000,
    description: 'Moves money between wallets.',
  });

  function wire() {
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const processed = new InMemoryProcessedOperationStore(
      clock,
      new SequentialIdGenerator(),
    );
    const claim = jest.spyOn(processed, 'claim');
    const router = new InternalRouter({ processed, clock, leaseMarginMs: 500 });
    const handler = jest.fn(async () =>
      CallOutcome.success({ transferId: 'tr-1' }),
    );
    router.register(Transfer, handler);
    const transport = new InProcessTransport(router);
    const invoke = jest.spyOn(transport, 'invoke');
    const registry = new ContractRegistry();
    registry.register(Transfer);
    const client = new InternalClient({ transport, registry, clock });
    return { clock, claim, handler, invoke, client };
  }

  it('never reaches the server with an invalid input', async () => {
    const { client, invoke } = wire();

    const outcome = await client.call(
      Transfer,
      { amount: 0 },
      { idempotencyKey: 'k' },
    );

    expect(outcome.kind).toBe(CallOutcomeKind.BusinessError);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('gives the same outcome for an invalid input on the client and on the router', async () => {
    const { client, clock } = wire();
    const router = new InternalRouter({
      processed: new InMemoryProcessedOperationStore(clock),
      clock,
    });
    router.register(Transfer, async () =>
      CallOutcome.success({ transferId: 'tr-1' }),
    );

    const fromClient = await client.call(
      Transfer,
      { amount: 0 },
      { idempotencyKey: 'k' },
    );
    const fromRouter = await router.handle(
      Transfer.id,
      { amount: 0 },
      {
        idempotencyKey: 'k',
        timeoutMs: 1000,
        deadline: clock.now().getTime() + 1000,
      },
    );

    expect(fromRouter).toEqual(fromClient);
    expect(fromClient).toMatchObject({
      kind: CallOutcomeKind.BusinessError,
      code: PlatformErrorCode.ValidationInvalidInput,
      details: { fieldErrors: [expect.objectContaining({ field: 'amount' })] },
    });
  });

  it('derives the attempt deadline and the server lease from one caller deadline', async () => {
    const { client, claim, clock } = wire();
    const deadline = Deadline.after(800, clock);

    await expect(
      client.call(
        Transfer,
        { amount: 5 },
        { idempotencyKey: 'k', tenantId: 't-1', deadline },
      ),
    ).resolves.toEqual(CallOutcome.success({ transferId: 'tr-1' }));

    const [key, request] = claim.mock.calls[0] ?? [];
    expect(key).toBe('["t-1","wallet.transfer.v1","k"]');
    expect(request?.deadline.atMs).toBe(deadline.atMs);
    expect(request?.leaseMarginMs).toBe(500);
  });

  it('runs the handler once per tenant-scoped key', async () => {
    const { client, handler } = wire();
    const call = (tenantId: string) =>
      client.call(Transfer, { amount: 5 }, { idempotencyKey: 'k', tenantId });

    await call('t-1');
    await call('t-1');
    await call('t-2');

    expect(handler).toHaveBeenCalledTimes(2);
  });
});

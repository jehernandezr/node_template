import { OperationResolver } from '../../contract/operation-resolver.js';
import { JsonSafetyChecker } from '../../contract/json-safety-checker.js';
import { defineOperation } from '@contracts/platform';
import { FixedClock } from '@platform/kernel/test-utils';
import { CallOutcome, CallOutcomeKind, Deadline } from '@platform/primitives';
import { z } from 'zod';
import { ContractRegistry } from '../../contract/contract-registry.js';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { OperationMetadata } from '../../contract/operation-metadata.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { InternalClientHarness } from './utils/internal-client-harness.js';

const REGISTRY_COLLABORATORS = {
  resolver: new OperationResolver(),
  jsonSafety: new JsonSafetyChecker(),
};

const NO_FUNDS = 'BILLING.INVOICES.NO_FUNDS';
const ok = CallOutcome.success({ id: 'i-1' });
const transient = CallOutcome.transientFailure('busy');
const uncertain = CallOutcome.uncertain('http-502');
const options = { idempotencyKey: 'key-1' };

const Create = defineOperation({
  id: 'billing.invoices.create.v1',
  input: z.object({
    amount: z.number().positive(),
    padding: z.string().optional(),
  }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  mutating: false,
  errors: [NO_FUNDS],
  timeoutMs: 1000,
  retry: { maxAttempts: 3, baseMs: 1, maxMs: 2 },
  description: 'Creates an invoice.',
});

const Charge = defineOperation({
  id: 'billing.charges.create.v1',
  input: z.object({ amount: z.number() }),
  output: z.object({ id: z.string() }),
  idempotent: false,
  mutating: false,
  timeoutMs: 1000,
  retry: { maxAttempts: 3, baseMs: 1, maxMs: 2 },
  description: 'Charges once.',
});

const Unregistered = defineOperation({
  id: 'billing.refunds.create.v1',
  input: z.object({ id: z.string() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  mutating: false,
  description: 'Never registered.',
});

function econnreset(): TypeError {
  return Object.assign(new TypeError('fetch failed'), {
    cause: { code: 'ECONNRESET' },
  });
}

describe('InternalClient', () => {
  describe('call with contract checks', () => {
    it('returns the parsed output on success', async () => {
      const harness = new InternalClientHarness();
      harness.transport.thenReturn(
        CallOutcome.success({ id: 'i-9', extra: 1 }),
      );

      await expect(
        harness.client.call(Create, { amount: 1 }, options),
      ).resolves.toEqual(CallOutcome.success({ id: 'i-9' }));
    });

    it('returns invalid input as a business error without calling the transport', async () => {
      const harness = new InternalClientHarness();

      await expect(
        harness.client.call(Create, { amount: -1 }, options),
      ).resolves.toMatchObject({
        kind: CallOutcomeKind.BusinessError,
        code: OperationMetadata.INVALID_INPUT_CODE,
        details: { fieldErrors: expect.any(Array) },
      });
      expect(harness.transport.calls).toBe(0);
    });

    it.each([
      ['a blank idempotency key', { idempotencyKey: ' ' }],
      [
        'a tenant of 200 characters',
        { idempotencyKey: 'key-1', tenantId: 't'.repeat(200) },
      ],
    ])('rejects %s as an invalid idempotency key', async (_label, call) => {
      const harness = new InternalClientHarness();

      await expect(
        harness.client.call(Create, { amount: 1 }, call),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.InvalidIdempotencyKey,
          InternalApiErrorCode.InvalidIdempotencyKey,
        ),
      );
      expect(harness.transport.calls).toBe(0);
    });

    it('rejects an input larger than the payload limit without calling the transport', async () => {
      const harness = new InternalClientHarness();

      await expect(
        harness.client.call(
          Create,
          { amount: 1, padding: 'x'.repeat(300_000) },
          options,
        ),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.PayloadTooLarge,
          InternalApiErrorCode.PayloadTooLarge,
        ),
      );
      expect(harness.transport.calls).toBe(0);
    });

    it('returns a protocol violation when the output does not match the contract', async () => {
      const harness = new InternalClientHarness();
      harness.transport.thenReturn(CallOutcome.success({ wrong: true }));

      await expect(
        harness.client.call(Create, { amount: 1 }, options),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.InvalidOutput,
          InternalApiErrorCode.InvalidOutput,
        ),
      );
    });

    it('maps an undeclared business error to a protocol violation without retrying', async () => {
      const harness = new InternalClientHarness();
      harness.transport.thenReturn(CallOutcome.businessError('SURPRISE'));

      await expect(
        harness.client.call(Create, { amount: 1 }, options),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UndeclaredError,
          'SURPRISE',
        ),
      );
      expect(harness.transport.calls).toBe(1);
    });

    it('returns a declared business error without retrying it', async () => {
      const harness = new InternalClientHarness();
      const businessError = CallOutcome.businessError(NO_FUNDS, {
        message: 'Low balance',
      });
      harness.transport.thenReturn(businessError);

      await expect(
        harness.client.call(Create, { amount: 1 }, options),
      ).resolves.toEqual(businessError);
      expect(harness.transport.calls).toBe(1);
    });
  });

  describe('call with retries', () => {
    it('retries a transient failure of an idempotent operation and returns the second attempt', async () => {
      const harness = new InternalClientHarness();
      harness.transport.thenReturn(transient).thenReturn(ok);

      await expect(
        harness.client.call(Create, { amount: 1 }, options),
      ).resolves.toEqual(ok);
      expect(harness.transport.calls).toBe(2);
    });

    it('attempts a transient failure of a non-idempotent operation once', async () => {
      const harness = new InternalClientHarness();
      harness.transport.thenReturn(transient);

      await expect(
        harness.client.call(Charge, { amount: 1 }, options),
      ).resolves.toEqual(transient);
      expect(harness.transport.calls).toBe(1);
    });

    it('retries an uncertain outcome of an idempotent operation', async () => {
      const harness = new InternalClientHarness();
      harness.transport.thenReturn(uncertain).thenReturn(ok);

      await expect(
        harness.client.call(Create, { amount: 1 }, options),
      ).resolves.toEqual(ok);
      expect(harness.transport.calls).toBe(2);
    });

    it('does not retry an uncertain outcome of a non-idempotent operation', async () => {
      const harness = new InternalClientHarness();
      harness.transport.thenReturn(uncertain);

      await expect(
        harness.client.call(Charge, { amount: 1 }, options),
      ).resolves.toEqual(uncertain);
      expect(harness.transport.calls).toBe(1);
    });

    it('returns the last outcome when the three attempts are exhausted', async () => {
      const harness = new InternalClientHarness();
      harness.transport.thenReturn(transient);

      await expect(
        harness.client.call(Create, { amount: 1 }, options),
      ).resolves.toEqual(transient);
      expect(harness.transport.calls).toBe(3);
    });

    it('retries a network exception and gives a transient failure when exhausted', async () => {
      const harness = new InternalClientHarness();
      harness.transport.thenThrow(econnreset());

      await expect(
        harness.client.call(Create, { amount: 1 }, options),
      ).resolves.toMatchObject({ kind: CallOutcomeKind.TransientFailure });
      expect(harness.transport.calls).toBe(3);
    });

    it('turns a plain error into a protocol violation with a single attempt', async () => {
      const harness = new InternalClientHarness();
      harness.transport.thenThrow(new Error('boom'));

      await expect(
        harness.client.call(Create, { amount: 1 }, options),
      ).resolves.toMatchObject({ kind: CallOutcomeKind.ProtocolViolation });
      expect(harness.transport.calls).toBe(1);
    });
  });

  describe('call with deadlines and cancellation', () => {
    it('does not call the transport when the caller signal is already aborted', async () => {
      const harness = new InternalClientHarness();

      await expect(
        harness.client.call(
          Create,
          { amount: 1 },
          {
            ...options,
            signal: AbortSignal.abort(),
          },
        ),
      ).resolves.toEqual(
        CallOutcome.transientFailure(InternalApiReason.Cancelled),
      );
      expect(harness.transport.calls).toBe(0);
    });

    it('resolves as uncertain when the caller aborts during an attempt', async () => {
      const harness = new InternalClientHarness();
      const controller = new AbortController();
      harness.transport.thenAbort(controller);

      await expect(
        harness.client.call(
          Create,
          { amount: 1 },
          {
            ...options,
            signal: controller.signal,
          },
        ),
      ).resolves.toEqual(CallOutcome.uncertain(InternalApiReason.Cancelled));
      expect(harness.transport.calls).toBe(1);
    });

    it('returns a transient deadline failure without calling when the deadline already passed', async () => {
      const harness = new InternalClientHarness({
        clock: new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
      });
      const deadline = Deadline.after(0, harness.clock);

      await expect(
        harness.client.call(Create, { amount: 1 }, { ...options, deadline }),
      ).resolves.toEqual(
        CallOutcome.transientFailure(InternalApiReason.DeadlineExceeded),
      );
      expect(harness.transport.calls).toBe(0);
    });
  });

  describe('catalogue', () => {
    it('rejects an operation that is not in the catalogue', async () => {
      const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
      registry.register(Create);
      const harness = new InternalClientHarness({ registry });

      await expect(
        harness.client.call(Unregistered, { id: 'x' }, options),
      ).resolves.toMatchObject({
        kind: CallOutcomeKind.ProtocolViolation,
        code: InternalApiErrorCode.UnknownOperation,
      });
      expect(harness.transport.calls).toBe(0);
    });

    it('calls a registered operation by id', async () => {
      const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
      registry.register(Create);
      const harness = new InternalClientHarness({ registry });
      harness.transport.thenReturn(ok);

      await expect(
        harness.client.callById(Create.id, { amount: 2 }, options),
      ).resolves.toEqual(ok);
      expect(harness.transport.calls).toBe(1);
    });

    it('answers unknown operation by id when there is no catalogue', async () => {
      const harness = new InternalClientHarness();

      await expect(
        harness.client.callById(Create.id, { amount: 2 }, options),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UnknownOperation,
          InternalApiErrorCode.UnknownOperation,
        ),
      );
      expect(harness.transport.calls).toBe(0);
    });

    it('answers unknown operation by id when the id is not in the catalogue', async () => {
      const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
      registry.register(Create);
      const harness = new InternalClientHarness({ registry });

      await expect(
        harness.client.callById('billing.nope.v1', {}, options),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UnknownOperation,
          InternalApiErrorCode.UnknownOperation,
        ),
      );
    });

    it('exposes the catalogue it was given', () => {
      const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
      const harness = new InternalClientHarness({ registry });

      expect(harness.client.contracts).toBe(registry);
    });
  });
});

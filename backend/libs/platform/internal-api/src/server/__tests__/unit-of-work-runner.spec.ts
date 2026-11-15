import { defineOperation } from '@contracts/platform';
import { DomainError, FailureKind } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CallOutcome, CallOutcomeKind } from '@platform/primitives';
import { z } from 'zod';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { RecordingTransactionManager } from '../../__tests__/utils/recording-transaction-manager.js';
import { FailingCommitTransactionManager } from './utils/failing-commit-transaction-manager.js';
import { FailingProcessedOperationStore } from './utils/failing-processed-operation-store.js';
import { OutOfStockError } from './utils/out-of-stock.error.js';
import { ScriptedHandler } from './utils/scripted-handler.js';
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

const input = { sku: 'A', qty: 1 };
const success = (reservationId = 'r-1') =>
  CallOutcome.success({ reservationId });
const outage = (): Error =>
  Object.assign(new Error('terminating connection'), {
    code: '57P01',
    failureKind: FailureKind.Transient,
  });

/** Error de dominio que el contrato de `Reserve` no declara. */
const undeclaredError = (): DomainError =>
  new (class extends DomainError {
    readonly code = 'STOCK.RESERVE.SURPRISE';
  })('surprise');

async function callReserve(harness: ServerHarness, key: string) {
  return harness.router.handle('stock.reserve.v1', input, harness.meta(key));
}

describe('UnitOfWorkRunner', () => {
  describe('stored results', () => {
    it('run, success with a unit of work, commits once and replays without running the handler', async () => {
      const transactions = new RecordingTransactionManager();
      const harness = new ServerHarness({ transactions });
      const handler = new ScriptedHandler<typeof Reserve>().thenReturn({
        outcome: success(),
      });
      harness.router.register(Reserve, handler);

      const first = await callReserve(harness, 'k');
      const second = await callReserve(harness, 'k');

      expect(first).toEqual(success());
      expect(second).toEqual(success());
      expect(transactions.commits).toBe(1);
      expect(transactions.rollbacks).toBe(0);
      expect(handler.calls).toBe(1);
    });

    it('run, success without a unit of work, stores the result and replays it', async () => {
      const harness = new ServerHarness();
      const handler = new ScriptedHandler<typeof Reserve>().thenReturn({
        outcome: success(),
      });
      harness.router.register(Reserve, handler);

      await callReserve(harness, 'k');
      const second = await callReserve(harness, 'k');

      expect(second).toEqual(success());
      expect(handler.calls).toBe(1);
    });

    it('run, handler throws a declared domain error, rolls back and stores the business error', async () => {
      const transactions = new RecordingTransactionManager();
      const harness = new ServerHarness({ transactions });
      const handler = new ScriptedHandler<typeof Reserve>().thenThrow(
        new OutOfStockError('No stock left', { sku: 'A' }),
      );
      harness.router.register(Reserve, handler);

      const first = await callReserve(harness, 'k');
      const second = await callReserve(harness, 'k');

      const expected = {
        kind: CallOutcomeKind.BusinessError,
        code: ServerHarness.OUT_OF_STOCK,
        message: 'No stock left',
        details: { sku: 'A' },
      };
      expect(first).toEqual(expected);
      expect(second).toEqual(expected);
      expect(transactions.rollbacks).toBe(1);
      expect(handler.calls).toBe(1);
    });

    it('run, success with commit false and a unit of work, rolls back and still returns and stores the success', async () => {
      const transactions = new RecordingTransactionManager();
      const harness = new ServerHarness({ transactions });
      const handler = new ScriptedHandler<typeof Reserve>().thenReturn({
        outcome: success(),
        commit: false,
      });
      harness.router.register(Reserve, handler);

      const first = await callReserve(harness, 'k');
      const second = await callReserve(harness, 'k');

      expect(first).toEqual(success());
      expect(second).toEqual(success());
      expect(transactions.rollbacks).toBe(1);
      expect(handler.calls).toBe(1);
    });

    it('run, success with commit false and no unit of work, stores it as any other result', async () => {
      const harness = new ServerHarness();
      const handler = new ScriptedHandler<typeof Reserve>().thenReturn({
        outcome: success(),
        commit: false,
      });
      harness.router.register(Reserve, handler);

      await callReserve(harness, 'k');
      await callReserve(harness, 'k');

      expect(handler.calls).toBe(1);
    });
  });

  describe('released keys', () => {
    it('run, transient failure with commit false and a unit of work, rolls back and runs the handler again', async () => {
      const transactions = new RecordingTransactionManager();
      const harness = new ServerHarness({ transactions });
      const handler = new ScriptedHandler<typeof Reserve>()
        .thenReturn({
          outcome: CallOutcome.transientFailure('db-down'),
          commit: false,
        })
        .thenReturn({ outcome: success() });
      harness.router.register(Reserve, handler);

      const first = await callReserve(harness, 'k');
      const second = await callReserve(harness, 'k');

      expect(first.kind).toBe(CallOutcomeKind.TransientFailure);
      expect(second).toEqual(success());
      expect(transactions.rollbacks).toBe(1);
      expect(handler.calls).toBe(2);
    });

    it('run, handler throws a transient error, does not store it and runs the handler again', async () => {
      const harness = new ServerHarness();
      const handler = new ScriptedHandler<typeof Reserve>()
        .thenThrow(outage())
        .thenReturn({ outcome: success() });
      harness.router.register(Reserve, handler);

      const first = await callReserve(harness, 'k');
      const second = await callReserve(harness, 'k');

      expect(first).toMatchObject({
        kind: CallOutcomeKind.TransientFailure,
        reason: '57P01',
      });
      expect(second).toEqual(success());
      expect(handler.calls).toBe(2);
    });

    it('run, handler throws an unknown error, answers protocol-violation and frees the key', async () => {
      const harness = new ServerHarness();
      const handler = new ScriptedHandler<typeof Reserve>()
        .thenThrow(new TypeError('x is undefined'))
        .thenReturn({ outcome: success() });
      harness.router.register(Reserve, handler);

      const first = await callReserve(harness, 'k');
      const second = await callReserve(harness, 'k');

      expect(first).toEqual(CallOutcome.protocolViolation('TypeError'));
      expect(second).toEqual(success());
    });

    it('run, handler times out, answers uncertain and frees the key', async () => {
      const harness = new ServerHarness();
      const timeout = Object.assign(new Error('took too long'), {
        name: 'TimeoutError',
      });
      harness.router.register(
        Reserve,
        new ScriptedHandler<typeof Reserve>()
          .thenThrow(timeout)
          .thenReturn({ outcome: success() }),
      );

      await expect(callReserve(harness, 'k')).resolves.toMatchObject({
        kind: CallOutcomeKind.Uncertain,
      });
      await expect(callReserve(harness, 'k')).resolves.toEqual(success());
    });

    it('run, handler throws an undeclared domain error, answers undeclared-error', async () => {
      const harness = new ServerHarness();
      harness.router.register(
        Reserve,
        new ScriptedHandler<typeof Reserve>().thenThrow(undeclaredError()),
      );

      await expect(callReserve(harness, 'k')).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UndeclaredError,
          'STOCK.RESERVE.SURPRISE',
        ),
      );
    });

    it('run, output that breaks the schema, answers invalid-output, rolls back and runs again', async () => {
      const transactions = new RecordingTransactionManager();
      const harness = new ServerHarness({ transactions });
      const handler = new ScriptedHandler<typeof Reserve>()
        .thenReturn({ outcome: CallOutcome.success({ wrong: 1 }) })
        .thenReturn({ outcome: success('r-valid') });
      harness.router.register(Reserve, handler);

      const first = await callReserve(harness, 'k');
      const second = await callReserve(harness, 'k');

      expect(first).toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.InvalidOutput,
          InternalApiErrorCode.InvalidOutput,
        ),
      );
      expect(second).toEqual(success('r-valid'));
      expect(transactions.rollbacks).toBe(1);
      expect(handler.calls).toBe(2);
    });

    it('run, undeclared business code returned, answers undeclared-error', async () => {
      const harness = new ServerHarness();
      harness.router.register(
        Reserve,
        new ScriptedHandler<typeof Reserve>().thenReturn({
          outcome: CallOutcome.businessError('SURPRISE'),
        }),
      );

      await expect(callReserve(harness, 'k')).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UndeclaredError,
          'SURPRISE',
        ),
      );
    });

    it('run, result that is not a handler result, answers invalid-handler-result', async () => {
      const harness = new ServerHarness();
      harness.router.register(
        Reserve,
        new ScriptedHandler<typeof Reserve>().thenReturn('nope'),
      );

      await expect(callReserve(harness, 'k')).resolves.toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.InvalidHandlerResult,
          InternalApiErrorCode.InvalidHandlerResult,
        ),
      );
    });
  });

  describe('failures of the unit of work', () => {
    it('run, commit fails, answers uncertain commit-failed', async () => {
      const harness = new ServerHarness({
        transactions: new FailingCommitTransactionManager(),
      });
      harness.router.register(
        Reserve,
        new ScriptedHandler<typeof Reserve>().thenReturn({
          outcome: success(),
        }),
      );

      await expect(callReserve(harness, 'k')).resolves.toMatchObject({
        kind: CallOutcomeKind.Uncertain,
        reason: InternalApiReason.CommitFailed,
      });
    });

    it('run, storing the result fails inside the unit of work, answers the error and frees the key', async () => {
      const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
      const store = new FailingProcessedOperationStore(
        clock,
        new SequentialIdGenerator(),
      ).failComplete(outage());
      const harness = new ServerHarness({
        clock,
        store,
        transactions: new RecordingTransactionManager(),
      });
      const handler = new ScriptedHandler<typeof Reserve>()
        .thenReturn({ outcome: success() })
        .thenReturn({ outcome: success() });
      harness.router.register(Reserve, handler);

      const first = await callReserve(harness, 'k');
      await callReserve(harness, 'k');

      expect(first).toMatchObject({
        kind: CallOutcomeKind.TransientFailure,
        reason: '57P01',
      });
      expect(handler.calls).toBe(2);
    });

    it('run, a slow attempt whose lease was taken over, is uncertain without a unit of work', async () => {
      const harness = new ServerHarness({ leaseMarginMs: 100 });
      const { slow, fast } = await startTakeover(harness);

      expect(fast).toEqual(success('r-fast'));
      await expect(slow).resolves.toMatchObject({
        kind: CallOutcomeKind.Uncertain,
        reason: InternalApiReason.StaleClaim,
      });
    });

    it('run, a slow attempt whose lease was taken over, is a transient failure with a unit of work', async () => {
      const transactions = new RecordingTransactionManager();
      const harness = new ServerHarness({ leaseMarginMs: 100, transactions });
      const { slow, fast } = await startTakeover(harness);

      expect(fast).toEqual(success('r-fast'));
      await expect(slow).resolves.toMatchObject({
        kind: CallOutcomeKind.TransientFailure,
        reason: InternalApiReason.StaleClaim,
      });
      await expect(callReserve(harness, 'k')).resolves.toEqual(
        success('r-fast'),
      );
    });
  });
});

/**
 * Un intento lento reclama la llave y se queda en el handler; otro la toma
 * cuando vence el lease. El lento termina después y su resultado no se guarda.
 */
async function startTakeover(harness: ServerHarness) {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  harness.router.register(
    Reserve,
    new ScriptedHandler<typeof Reserve>()
      .thenReturn({ outcome: success('r-slow') }, gate)
      .thenReturn({ outcome: success('r-fast') }),
  );
  const slow = callReserve(harness, 'k');
  await harness.settle();
  harness.clock.advance(1_101);
  const fast = await callReserve(harness, 'k');
  open();
  return { slow, fast };
}

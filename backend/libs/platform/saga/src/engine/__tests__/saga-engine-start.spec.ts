import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { InMemoryTransactionManager } from '../../__tests__/utils/in-memory-transaction-manager.js';
import { FakeParticipant } from '../../__tests__/utils/fake-participant.js';
import { InMemorySagaStore } from '../../__tests__/utils/in-memory-saga-store.js';
import { SagaEngineKit } from '../../__tests__/utils/saga-engine-kit.js';
import {
  PivotSaga,
  ThreeStepSaga,
} from '../../__tests__/utils/sample-sagas.js';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaError } from '../../errors/saga-error.js';
import { SagaEventKind } from '../../model/saga-event-kind.enum.js';
import { SagaPayload } from '../../model/saga-payload.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import type { StartOptions } from '../start-options.js';

function setup(options: { transactions?: InMemoryTransactionManager } = {}) {
  const participant = new FakeParticipant();
  const kit = new SagaEngineKit({
    invoker: participant,
    definitions: [new ThreeStepSaga(), new PivotSaga()],
    ...(options.transactions === undefined
      ? {}
      : { transactions: options.transactions }),
  });
  return { kit, participant };
}

/** Code of the `SagaError` the action throws, or `undefined` if it throws none. */
async function codeOf(action: Promise<unknown>): Promise<unknown> {
  try {
    await action;
  } catch (error) {
    return error instanceof SagaError ? error.code : error;
  }
  return undefined;
}

describe('SagaEngine.start', () => {
  describe('idempotent start', () => {
    it('returns the existing instance without running the saga again', async () => {
      const { kit, participant } = setup();

      const first = await kit.sagas.start(
        ThreeStepSaga,
        {},
        {
          idempotencyKey: 'order-1',
        },
      );
      const second = await kit.sagas.start(
        ThreeStepSaga,
        {},
        {
          idempotencyKey: 'order-1',
        },
      );

      expect(second.id).toBe(first.id);
      expect(second.status).toBe(SagaStatus.Completed);
      expect(participant.operations()).toHaveLength(3);
    });

    it('treats the input as the same even when the keys come in another order', async () => {
      const { kit, participant } = setup();

      const first = await kit.sagas.start(
        ThreeStepSaga,
        { a: 'x', b: 'y' },
        { idempotencyKey: 'order-1' },
      );
      const second = await kit.sagas.start(
        ThreeStepSaga,
        { b: 'y', a: 'x' },
        { idempotencyKey: 'order-1' },
      );

      expect(second.id).toBe(first.id);
      expect(participant.operations()).toHaveLength(3);
    });

    it('rejects the same key with another input with IdempotencyKeyConflict', async () => {
      const { kit, participant } = setup();
      await kit.sagas.start(
        ThreeStepSaga,
        { a: 'x' },
        { idempotencyKey: 'k1' },
      );

      expect(
        await codeOf(
          kit.sagas.start(
            ThreeStepSaga,
            { a: 'other' },
            { idempotencyKey: 'k1' },
          ),
        ),
      ).toBe(SagaErrorCode.IdempotencyKeyConflict);
      expect(participant.operations()).toHaveLength(3);
    });

    it('rejects the same key from another saga type', async () => {
      const { kit } = setup();
      await kit.sagas.start(ThreeStepSaga, {}, { idempotencyKey: 'k1' });

      expect(
        await codeOf(kit.sagas.start(PivotSaga, {}, { idempotencyKey: 'k1' })),
      ).toBe(SagaErrorCode.IdempotencyKeyConflict);
    });

    it('stores the fingerprint of the initial input with the instance', async () => {
      const { kit } = setup();

      await kit.sagas.start(ThreeStepSaga, { a: 'x' }, {
        sagaId: 's1',
        idempotencyKey: 'k1',
      } satisfies StartOptions);

      expect((await kit.store.get('s1'))?.inputDigest).toBe(
        SagaPayload.digest({ a: 'x' }),
      );
    });
  });

  describe('input validation', () => {
    it('rejects a state that does not survive JSON with InvalidState', async () => {
      const { kit } = setup();

      expect(
        await codeOf(kit.engine.start('three-step', { seen: new Map() })),
      ).toBe(SagaErrorCode.InvalidState);
      expect(
        await codeOf(kit.engine.start('three-step', { when: new Date() })),
      ).toBe(SagaErrorCode.InvalidState);
    });

    it('rejects an unknown saga type with UnknownDefinition', async () => {
      const { kit } = setup();

      expect(await codeOf(kit.engine.start('unknown', {}))).toBe(
        SagaErrorCode.UnknownDefinition,
      );
    });
  });

  describe('use case transactions', () => {
    it('creates the instance inside the transaction and runs it after commit', async () => {
      const transactions = new InMemoryTransactionManager();
      const { kit, participant } = setup({ transactions });
      let id = '';

      await transactions.runInTransaction(async () => {
        const started = await kit.sagas.start(
          ThreeStepSaga,
          {},
          { idempotencyKey: 'k' },
        );
        id = started.id;
        expect(started.status).toBe(SagaStatus.Running);
        expect(participant.calls).toHaveLength(0);
      });

      expect((await kit.store.get(id))?.status).toBe(SagaStatus.Completed);
      expect(participant.operations()).toHaveLength(3);
    });

    it('runs no step if the transaction rolls back after starting', async () => {
      const transactions = new InMemoryTransactionManager();
      const { kit, participant } = setup({ transactions });

      await expect(
        transactions.runInTransaction(async () => {
          await kit.sagas.start(ThreeStepSaga, {}, { idempotencyKey: 'k' });
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(participant.calls).toHaveLength(0);
    });

    it('outside a transaction it runs the saga immediately', async () => {
      const transactions = new InMemoryTransactionManager();
      const { kit, participant } = setup({ transactions });

      const result = await kit.sagas.start(ThreeStepSaga, {});

      expect(result.status).toBe(SagaStatus.Completed);
      expect(participant.operations()).toHaveLength(3);
    });
  });

  describe('events and listeners', () => {
    it('emits nothing when resuming an already finished saga', async () => {
      const { kit } = setup();
      await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });
      const events: SagaEventKind[] = [];
      kit.events.subscribe((event) => {
        events.push(event.kind);
      });

      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.status).toBe(SagaStatus.Completed);
      expect(events).toEqual([]);
    });

    it('emits nothing when a retry leaves the saga suspended', async () => {
      const { kit, participant } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
        CallOutcome.transientFailure('timeout'),
      );
      const events: SagaEventKind[] = [];
      kit.events.subscribe((event) => {
        events.push(event.kind);
      });
      await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });
      expect(events).toEqual([SagaEventKind.Suspended]);
      events.length = 0;

      kit.clock.advance(1_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.status).toBe(SagaStatus.Suspended);
      expect(events).toEqual([]);
    });

    it('ignores listeners that throw or reject', async () => {
      const { kit } = setup();
      kit.events.subscribe(() => {
        throw new Error('sync listener');
      });
      kit.events.subscribe(() => Promise.reject(new Error('async listener')));

      await expect(
        kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' }),
      ).resolves.toMatchObject({ status: SagaStatus.Completed });
    });
  });

  describe('identifiers and tokens', () => {
    it('generates the saga id and the lease token with the IdGenerator', async () => {
      const store = new (class extends InMemorySagaStore {
        readonly tokens: string[] = [];

        override async releaseLease(id: string, token: string): Promise<void> {
          this.tokens.push(token);
          return super.releaseLease(id, token);
        }
      })();
      const kit = new SagaEngineKit({
        invoker: new FakeParticipant(),
        definitions: [new ThreeStepSaga()],
        store,
      });
      const expected = new SequentialIdGenerator();

      const result = await kit.sagas.start(ThreeStepSaga, {});

      expect(result.id).toBe(expected.next().toString());
      expect(store.tokens[0]).toBe(`node-a:${expected.next().toString()}`);
    });
  });
});

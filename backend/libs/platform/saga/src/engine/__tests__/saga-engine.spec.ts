import { CallOutcome } from '@platform/primitives';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaError } from '../../errors/saga-error.js';
import {
  CrashingSagaStore,
  ProcessDied,
} from '../../__tests__/utils/crashing-saga-store.js';
import { FakeParticipant } from '../../__tests__/utils/fake-participant.js';
import { InMemorySagaStore } from '../../__tests__/utils/in-memory-saga-store.js';
import { SagaEngineKit } from '../../__tests__/utils/saga-engine-kit.js';
import {
  PivotSaga,
  ThreeStepSaga,
  type SampleState,
} from '../../__tests__/utils/sample-sagas.js';
import type { SagaInstance } from '../../model/saga-instance.js';
import { SagaEventKind } from '../../model/saga-event-kind.enum.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import { StepDirection } from '../../model/step-direction.enum.js';
import { StepStatus } from '../../model/step-status.enum.js';
import type { DispatchWrite } from '../../store/dispatch-write.js';

/** A store that dies once, right after dispatching the compensation of the chosen step. */
class CrashOnCompensation extends CrashingSagaStore {
  private armed = true;

  override async dispatchStep(write: DispatchWrite): Promise<SagaInstance> {
    if (this.armed && write.step.direction === StepDirection.Compensate) {
      this.armed = false;
      this.crashAfterDispatch(write.step.stepIndex);
    }
    return super.dispatchStep(write);
  }
}

/** Invoker that, once, lets another run finish the saga before its own call. */
class StaleRunInvoker extends FakeParticipant {
  private armed = true;

  constructor(
    private readonly takeOver: () => Promise<void>,
    private readonly operationId: string,
  ) {
    super();
  }

  override async invoke(
    operationId: string,
    input: unknown,
    key: string,
    options?: Parameters<FakeParticipant['invoke']>[3],
  ): Promise<CallOutcome<unknown>> {
    if (this.armed && operationId === this.operationId) {
      this.armed = false;
      await this.takeOver();
    }
    return super.invoke(operationId, input, key, options);
  }
}

/** Common setup: a participant, a saga engine and the events it emits. */
function setup(store?: InMemorySagaStore) {
  const participant = new FakeParticipant();
  const kit = new SagaEngineKit({
    invoker: participant,
    definitions: [new ThreeStepSaga(), new PivotSaga()],
    ...(store === undefined ? {} : { store }),
  });
  const events: SagaEventKind[] = [];
  kit.events.subscribe((event) => {
    events.push(event.kind);
  });
  return { kit, participant, events, store: kit.store };
}

describe('SagaEngine', () => {
  describe('happy path and compensation', () => {
    it('runs each step in order, completes and normalizes the outputs', async () => {
      const { kit, participant, events, store } = setup();

      const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Completed);
      expect(result.state).toEqual({
        a: 'a-1',
        b: 'b-2',
        c: 'c-3',
        bAt: '1970-01-01T00:00:00.000Z',
      });
      expect(participant.operations()).toEqual([
        'a.create.v1',
        'b.create.v1',
        'c.create.v1',
      ]);
      expect(participant.liveResources).toBe(3);
      const logged = (await store.steps('s1')).find(
        (entry) => entry.stepIndex === 1,
      );
      expect((logged?.output as { at: string }).at).toBe(
        '1970-01-01T00:00:00.000Z',
      );
      expect(events).toEqual([SagaEventKind.Completed]);
    });

    it('compensates the completed steps in reverse order after a business error', async () => {
      const { kit, participant, events } = setup();
      participant.script('c.create.v1', CallOutcome.businessError('SOLD_OUT'));

      const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe('SOLD_OUT');
      expect(participant.removes()).toEqual(['b.remove.v1', 'a.remove.v1']);
      expect(participant.liveResources).toBe(0);
      expect(events).toEqual([SagaEventKind.Compensated]);
    });

    it('moves to CompensationFailed when a compensation returns a business error', async () => {
      const { kit, participant } = setup();
      participant.script('c.create.v1', CallOutcome.businessError('SOLD_OUT'));
      participant.script('b.remove.v1', CallOutcome.businessError('LOCKED'));

      const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.CompensationFailed);
      expect(result.lastErrorCode).toBe('LOCKED');
      expect(participant.removes()).toEqual(['b.remove.v1']);
      expect(participant.liveResources).toBe(2);
    });

    it('suspends on a transient compensation failure and finishes on retry', async () => {
      const { kit, participant } = setup();
      participant.script('c.create.v1', CallOutcome.businessError('SOLD_OUT'));
      participant.script(
        'b.remove.v1',
        CallOutcome.transientFailure('timeout'),
      );

      const suspended = await kit.sagas.start(
        ThreeStepSaga,
        {},
        { sagaId: 's1' },
      );
      expect(suspended.status).toBe(SagaStatus.Suspended);
      expect(suspended.direction).toBe(StepDirection.Compensate);

      kit.clock.advance(1_000);
      const resumed = await kit.engineFor('node-b').resume('s1');

      expect(resumed.status).toBe(SagaStatus.Compensated);
      expect(participant.removes()).toEqual([
        'b.remove.v1',
        'b.remove.v1',
        'a.remove.v1',
      ]);
      expect(participant.liveResources).toBe(0);
    });
  });

  describe('crash and recovery', () => {
    it('resends a dispatched step with the same key after a crash and produces a single effect', async () => {
      const store = new CrashingSagaStore();
      const { kit, participant } = setup(store);
      store.crashAfterDispatch(1);

      await expect(
        kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' }),
      ).rejects.toBeInstanceOf(ProcessDied);
      expect(participant.operations()).toEqual(['a.create.v1']);

      kit.clock.advance(30_001);
      const resumed = await kit.engineFor('node-b').resume('s1');

      expect(resumed.status).toBe(SagaStatus.Completed);
      expect(participant.keysOf('b.create.v1')).toEqual(['s1:1:forward']);
      expect(participant.effects.get('b.create.v1')).toBe(1);
    });

    it('repeats a call whose effect happened before the crash and returns the stored result', async () => {
      const store = new CrashingSagaStore();
      const { kit, participant } = setup(store);
      store.crashBeforeOutcome(1);

      await expect(
        kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' }),
      ).rejects.toBeInstanceOf(ProcessDied);
      expect(participant.effects.get('b.create.v1')).toBe(1);

      kit.clock.advance(30_001);
      const resumed = await kit.engineFor('node-b').resume('s1');

      expect(participant.keysOf('b.create.v1')).toEqual([
        's1:1:forward',
        's1:1:forward',
      ]);
      expect(participant.effects.get('b.create.v1')).toBe(1);
      expect((resumed.state as SampleState).bAt).toBe(
        '1970-01-01T00:00:00.000Z',
      );
    });

    it('does not resume a saga whose lease is held by another run until the lease expires', async () => {
      const store = new CrashingSagaStore();
      const { kit } = setup(store);
      store.crashAfterDispatch();
      await expect(
        kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' }),
      ).rejects.toBeInstanceOf(ProcessDied);

      const blocked = await kit
        .engineFor('node-b')
        .resume('s1')
        .catch((error: unknown) => error);
      expect((blocked as SagaError).code).toBe(SagaErrorCode.LeaseNotAcquired);

      kit.clock.advance(30_001);
      await expect(kit.engineFor('node-b').resume('s1')).resolves.toMatchObject(
        { status: SagaStatus.Completed },
      );
    });

    it('lets only one of two concurrent resumptions run the step', async () => {
      const store = new CrashingSagaStore();
      const { kit, participant } = setup(store);
      store.crashAfterDispatch(1);
      await expect(
        kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' }),
      ).rejects.toBeInstanceOf(ProcessDied);
      kit.clock.advance(30_001);

      const worker = kit.engineFor('node-b');
      const outcomes = await Promise.allSettled([
        worker.resume('s1'),
        worker.resume('s1'),
      ]);

      expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
      const rejected = outcomes.find(
        (o): o is PromiseRejectedResult => o.status === 'rejected',
      );
      expect((rejected?.reason as SagaError).code).toBe(
        SagaErrorCode.LeaseNotAcquired,
      );
      expect(
        participant.calls.filter((c) => c.operationId === 'b.create.v1'),
      ).toHaveLength(1);
      expect(participant.effects.get('b.create.v1')).toBe(1);
    });

    it('rejects the write of a stale run that lost the lease and leaves the record to the new one', async () => {
      const store = new InMemorySagaStore();
      const holder: { kit?: SagaEngineKit } = {};
      const stale = new StaleRunInvoker(async () => {
        holder.kit?.clock.advance(30_001);
        await holder.kit?.engineFor('node-b').resume('s1');
      }, 'b.create.v1');
      const kit = new SagaEngineKit({
        invoker: stale,
        definitions: [new ThreeStepSaga()],
        store,
      });
      holder.kit = kit;

      const error: unknown = await kit.sagas
        .start(ThreeStepSaga, {}, { sagaId: 's1' })
        .catch((caught: unknown) => caught);

      expect((error as SagaError).code).toBe(SagaErrorCode.LeaseLost);
      expect(stale.effects.get('b.create.v1')).toBe(1);
      const logged = (await store.steps('s1')).find(
        (entry) => entry.stepIndex === 1,
      );
      expect(logged?.status).toBe(StepStatus.Succeeded);
      expect((await store.get('s1'))?.status).toBe(SagaStatus.Completed);
    });
  });

  describe('acceptance: a crash halfway through compensation does not change the result', () => {
    async function runFailingSaga(crash: boolean) {
      const store = crash ? new CrashOnCompensation() : new CrashingSagaStore();
      const { kit, participant } = setup(store);
      participant.script('c.create.v1', CallOutcome.businessError('SOLD_OUT'));
      if (crash) {
        await expect(
          kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' }),
        ).rejects.toBeInstanceOf(ProcessDied);
        kit.clock.advance(30_001);
        await kit.engineFor('node-b').resume('s1');
      } else {
        await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });
      }
      const instance = await store.get('s1');
      const steps = (await store.steps('s1')).map((entry) => ({
        stepIndex: entry.stepIndex,
        direction: entry.direction,
        operationId: entry.operationId,
        status: entry.status,
        idempotencyKey: entry.idempotencyKey,
        input: entry.input,
        output: entry.output,
        errorCode: entry.errorCode,
      }));
      return {
        participant,
        status: instance?.status,
        currentStep: instance?.currentStep,
        lastErrorCode: instance?.lastErrorCode,
        steps,
      };
    }

    it('compensates the first two with the stored input and output, with the same keys', async () => {
      const control = await runFailingSaga(false);
      const crashed = await runFailingSaga(true);

      expect(crashed.status).toBe(SagaStatus.Compensated);
      expect(crashed.steps).toEqual(control.steps);
      expect(crashed.currentStep).toBe(control.currentStep);
      expect(crashed.lastErrorCode).toBe(control.lastErrorCode);
      expect(crashed.participant.removes()).toEqual([
        'b.remove.v1',
        'a.remove.v1',
      ]);
      expect(new Set(crashed.participant.keysOf('b.remove.v1')).size).toBe(1);
      expect(crashed.participant.liveResources).toBe(0);
    });
  });
});
